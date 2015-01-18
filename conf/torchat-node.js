var conf = {
    client: {
        name: 'torchat-node',
        version: '0.0.1'
    },
    profile: {
        address: 'youraddress',
        alias: 'myself',
        description: ''
    },
    servicePort: 11009,
    torSocksPort: 9050,
    buddies: [
        {
            address: 'buddyaddres',
            profile : {
                name: 'Test',
                description: ''
            },
            client: {
                name: 'torchat-node',
                version: '0.0.1'
            },
            active: true,
            lastConnection: ''
        }
    ]
};
module.exports = conf;
