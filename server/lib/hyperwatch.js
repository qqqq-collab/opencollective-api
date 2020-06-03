import hyperwatch from '@hyperwatch/hyperwatch';
import config from 'config';
import expressBasicAuth from 'express-basic-auth';
import expressWs from 'express-ws';
import { get, pick } from 'lodash';

import { parseToBoolean } from './utils';

const load = async app => {
  if (!config.hyperwatch && parseToBoolean(config.hyperwatch.enabled) !== true) {
    return;
  }

  const { input, lib, modules, pipeline } = hyperwatch;

  // Configure input

  const expressInput = input.express.create();

  app.use((req, res, next) => {
    req.startAt = new Date();

    res.on('finish', () => {
      const { success, reject } = expressInput;
      req.endAt = new Date();
      try {
        const executionTime = req.endAt - req.startAt;
        let log = hyperwatch.util.createLog(req, res).set('executionTime', executionTime);

        log = log.deleteIn(['request', 'headers', 'authorization']);
        log = log.deleteIn(['request', 'headers', 'cookie']);

        if (req.body && req.body.query && req.body.variables) {
          log = log.set('graphql', req.body);
        }

        if (req.clientApp) {
          log = log.setIn(['opencollective', 'application', 'id'], req.clientApp.id);
        }

        if (req.remoteUser) {
          log = log.setIn(['opencollective', 'user', 'id'], req.remoteUser.id);
          log = log.setIn(['opencollective', 'user', 'email'], req.remoteUser.email);
          const collective = req.remoteUser.userCollective;
          if (collective) {
            log = log.setIn(['opencollective', 'collective', 'id'], collective.id);
            log = log.setIn(['opencollective', 'collective', 'slug'], collective.slug);
          }
        }
        success(log);
      } catch (err) {
        reject(err);
      }
    });

    next();
  });

  pipeline.registerInput(expressInput);

  // Mount Hyperwatch API and Websocket

  if (config.hyperwatch.secret) {
    // We need to setup express-ws here to make Hyperwatch's websocket works
    expressWs(app);
    const hyperwatchBasicAuth = expressBasicAuth({
      users: { [config.hyperwatch.username]: config.hyperwatch.secret },
      challenge: true,
      realm: config.hyperwatch.realm,
    });
    app.use(config.hyperwatch.path, hyperwatchBasicAuth, hyperwatch.app.api);
    app.use(config.hyperwatch.path, hyperwatchBasicAuth, hyperwatch.app.websocket);
  }

  // Configure logs

  const formatRequest = log => {
    if (log.has('graphql')) {
      const pickList = [
        'id',
        'slug',
        'collectiveSlug',
        'CollectiveSlug',
        'CollectiveId',
        'legacyExpenseId',
        'tierId',
        'term',
      ];
      const operationName = log.getIn(['graphql', 'operationName'], 'unknown');
      const variables = log.hasIn(['graphql', 'variables']) ? log.getIn(['graphql', 'variables']) : {};
      return `${operationName} ${JSON.stringify(pick(variables, pickList))}`;
    }

    const method = log.getIn(['request', 'method']);
    const url = log.getIn(['request', 'url']).split('?')[0];
    const status = log.getIn(['response', 'status']);
    return `"${method} ${url} ${status}"`;
  };

  const graphqlFormatter = (log, output) => ({
    time: lib.formatter.time(log),
    address: lib.formatter.address(log),
    request: formatRequest(log),
    executionTime: lib.formatter.executionTime(log, output),
    agent: lib.formatter.agent(log),
  });

  const graphqlHtmlFormatter = new lib.formatter.Formatter('html', graphqlFormatter);
  const graphqlConsoleFormatter = new lib.formatter.Formatter('console', graphqlFormatter);

  modules.logs.setFormatter(graphqlHtmlFormatter);

  pipeline.filter(log => log.has('graphql')).registerNode('graphql');

  // Access Logs
  if (get(config, 'log.accessLogs')) {
    pipeline.getNode('main').map(log => console.log(graphqlConsoleFormatter.format(log)));
  }

  // Start

  modules.load();

  pipeline.start();
};

export default load;
