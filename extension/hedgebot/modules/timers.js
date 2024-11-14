const Module = require('./module');

class TimersModule extends Module
{
    static get id() { return "Timer"; }

    init()
    {
        this.replicants.timers = this.nodecg.Replicant("timers", "hedgebot", this.DEFAULT_REPLICANT_OPTS);
        this.replicants.serverOffset = this.nodecg.Replicant("serverOffset", "hedgebot", this.DEFAULT_REPLICANT_OPTS);
        this.client.on('timer/*', this.onTimerUpdate.bind(this));

        this.fetchTimers(true);

        // Add interval to periodically fetch remote timers to avoid desync
        if (this.nodecg.bundleConfig.refreshInterval.timers) {
            this.fetchTimersInterval = setInterval(
                this.fetchTimers.bind(this), 
                this.nodecg.bundleConfig.refreshInterval.timers
            );
        }
    }

    fetchTimers(verbose = false)
    {
        let timerList = {};
        let fetchedIds = [];
        let promises = [];
        let timerCount = 0;

        if (verbose) {
            this.nodecg.log.info("Fetching timer status: " + Object.values(this.nodecg.bundleConfig.timers).join(", "));
        }

        // Fetching timers
        for(let type in this.nodecg.bundleConfig.timers) {
            let timerId = this.nodecg.bundleConfig.timers[type];
            let prom = this.client.query("/plugin/timer", "getTimerById", [timerId])
                .then((timer) => {
                    // Handle the case when the requested timer does not exist
                    if(!timer) {
                        this.nodecg.log.error("Cannot fetch timer " + timerId);
                        return;
                    }

                    timerCount++;
                    fetchedIds.push(timer.id);
                    timerList[type] = timer;
                });
            
            promises.push(prom);
        }

        Promise.all(promises).then(() => {
            if (verbose) {
                this.nodecg.log.info("Fetched " + timerCount + " timers: " + fetchedIds.join(", "));
            }

            this.replicants.timers.value = timerList;

            this.fetchServerOffset();
        });
    }

    fetchServerOffset(verbose = false)
    {
        if (verbose) {
            this.nodecg.log.info("Fetching server time offset...");
        }

        // Fetching server time and computing offset with local time
        this.client.query("/plugin/timer", "getLocalTime")
            .then((serverTime) => this.setServerOffset(serverTime, true));
    }

    setServerOffset(serverTime, verbose = false)
    {
        let localTime = new Date();
        let remoteTime = new Date(serverTime.time);
        remoteTime.setMilliseconds(serverTime.msec);
        
        let timeDiff = localTime - remoteTime;
        
        if (verbose) {
            this.nodecg.log.info("Fetched remote server time: " + serverTime.time + ' (' + serverTime.msec + 'ms)');
            this.nodecg.log.info("Time diff w/ server is " + timeDiff + " ms");
        }

        this.replicants.serverOffset.value = timeDiff;
    }

    // Events //

    onTimerUpdate(data)
    {
        let serverTime = {
            time: data.localTime,
            msec: data.msec
        };

        this.setServerOffset(serverTime);

        for(let timerType in this.replicants.timers.value) {
            let timer = this.replicants.timers.value[timerType];
            if(timer.id == data.timer.id) {
                this.replicants.timers.value[timerType] = data.timer;
            }
        }
    }
}

module.exports=  TimersModule;