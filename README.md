# Hedgebot NodeCG bundle

This bundles allows you to fetch Hedgebot information into NodeCG. It can fetch mainly 2 types of info :

- Schedule data
- Timer status

## Configuration

Configuration can be done in your NodeCG install by adding a `cfg/hedgebot.json` file. Here are the available
configuration variables :

```json
{
    "channel": "linkboss", // Channel to use to fetch active schedules from
    // Timers: each element in this object references a timer id with a specified key (not )
    "timers": {
        "key": "timer-id"
    },
    // Bot client (and relay) configuration
    "client": {
        "baseUrl": "http://127.0.0.1:8081/", // Bot host and port
        "token": "notsosecret", // Authorization token
        "eventRelay": {
            "url": "http://127.0.0.1:8082/.well-known/mercure", // Event relay base URL
            "jwt": "SomeJWTToken", // JWT to authorize the client on the relay
            "topic": "event" // Topic to subscribe to (must match the one set on the bot)
        }
    },
    "hosts": {
        "displayTime": 10000 // Display time set for auto timed host display 
    }
}
```

## Replicants

All Replicants this bundle uses are stored under the `hedgebot` namespace.
Fetched data form the bot gets put into multiple replicants to use in your layouts :

- `connected`: Whether the bundle has connected to the Mercure event relay or not.
- `scheduleCurrent`: The current item in the active schedule for the configured channel.
- `scheduleNext`: The next item in the active schedule for the configured channel.
- `schedule`: The full active schedule data for the configured channel.
- `timers`: The timers fetched from the bot according to the configuration.