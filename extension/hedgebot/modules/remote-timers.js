const Module = require('./module');

class RemoteTimersModule extends Module
{
    static get id() { return "RemoteTimer"; }

    init()
    {
        this.replicants.remoteTimers = this.nodecg.Replicant("remoteTimers", "hedgebot", this.DEFAULT_REPLICANT_OPTS);

        this.client.on('remoteTimerList/reload', this.onRemoteTimerReload.bind(this));
        this.client.on('remoteTimer/update', this.onRemoteTimerUpdate.bind(this));
        this.client.on('remoteTimer/new', this.onRemoteTimerNew.bind(this));
        this.client.on('remoteTimer/delete', this.onRemoteTimerDelete.bind(this));

        this.fetchRemoteTimers(true);

        // Add interval to periodically fetch remote timers to avoid desync
        if (this.nodecg.bundleConfig.refreshInterval.remoteTimers) {
            this.fetchRemoteTimersInterval = setInterval(
                this.fetchRemoteTimers.bind(this), 
                this.nodecg.bundleConfig.refreshInterval.remoteTimers
            );
        }
    }

    fetchRemoteTimers(verbose = false)
    {
        if (verbose) {
            this.nodecg.log.info("Fetching remote timers...");
        }

        this.client.query("/plugin/remote-timer", "getTimers")
            .then((timers) => {
                this.replicants.remoteTimers.value = timers;
            });
    }

    // Events //

    onRemoteTimerReload(data)
    {
        let serverTime = {
            time: data.localTime,
            msec: data.msec
        };

        this.setServerOffset(serverTime);
        this.replicants.remoteTimers.value = data.list;
    }

    onRemoteTimerUpdate(data)
    {
        let serverTime = {
            time: data.localTime,
            msec: data.msec
        };

        this.setServerOffset(serverTime);

        for(let index in this.replicants.remoteTimers.value) {
            let timer = this.replicants.remoteTimers.value[index];
            if(timer.key == data.remoteTimer.key) {
                this.replicants.remoteTimers.value[index] = data.remoteTimer;
            }
        }
    }

    onRemoteTimerNew(data)
    {
        let serverTime = {
            time: data.localTime,
            msec: data.msec
        };

        this.setServerOffset(serverTime);
        this.replicants.remoteTimers.value.push(data.remoteTimer);
    }

    onRemoteTimerDelete(data)
    {

        let serverTime = {
            time: data.localTime,
            msec: data.msec
        };

        this.setServerOffset(serverTime);
        
        for(let index in this.replicants.remoteTimers.value) {
            let timer = this.replicants.remoteTimers.value[index];
            if(timer.key == data.remoteTimer.key) {
                this.replicants.remoteTimers.value.splice(index, 1);
                return;
            }
        }
    }
}

module.exports = RemoteTimersModule;