# torchat-node

torchat-node is an implementation of torchat written in node for all to enjoy. 

The primary purpose is to allow TTY chatting over the tor network using the
pre-defined torchat protocol. The TTY interface is both bland and simple.
Being this way is by design and is designed to not attact attention that a 
normal instant messaging appliation would typically bring.

**By using torchat-node you are doing so at your own risk. There is no
guarantee your communication is either anonymous or secure during transmission.
While all attempts have been made to meet the specification there is a chance
that some items have been missed. Use at your own risk.**

## PreReq for torchat-node

In order to run torchat you must install tor and it must be running as
a SOCKS 5 proxy. You also need to configure a "hidden_service" listening
on port 11009 which is the default torchat port. If you need help feel free
to reach out or better yet check on [torproject](torproject.org) for details.

## Using torchat-node

In order to run torchat-node you will need to pull down the source code and
install a copy locally on your computer. The package is not yet ready for 
prime time so it has not been pushed to npm. I do have plans in the future
to publish this to npm.


#### Configuration

Currently the TTY front end does not allow adding friends directly. You will 
need to manually edit the configuration file within your instance. This will 
change as this feature is added.

*Example Buddies Configuration

```
buddies: [{
        address: 'notarealaddress',
        profile: {
            name: 'Example 1',
            description: 'Example 1'
        },
        client: {
            name: '',
            version: ''
        },
        active: true,
        lastConnection: ''
    }, {
        address: 'notarealaddress2',
        profile: {
            name: 'Example 2',
            description: 'Example 2'
        },
        client: {
            name: '',
            version: ''
        },
        active: true,
        lastConnection: ''
    }
]
```

#### Running

To start torchat-node

```
node index.js
````

