// @ts-check
const { BackendApplicationConfigProvider } = require('@theia/core/lib/node/backend-application-config-provider');
const main = require('@theia/core/lib/node/main');

BackendApplicationConfigProvider.set({
    "singleInstance": true,
    "frontendConnectionTimeout": 0,
    "configurationFolder": ".theia"
});

globalThis.extensionInfo = [
    {
        "name": "@theia/core",
        "version": "1.69.0"
    },
    {
        "name": "@theia/messages",
        "version": "1.69.0"
    },
    {
        "name": "clark-core-extension",
        "version": "0.1.0"
    },
    {
        "name": "clark-messaging-extension",
        "version": "0.1.0"
    }
];

const serverModule = require('./server');
const serverAddress = main.start(serverModule());

serverAddress.then((addressInfo) => {
    if (process && process.send && addressInfo) {
        process.send(addressInfo);
    }
});

globalThis.serverAddress = serverAddress;
