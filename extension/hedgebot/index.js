const Client = require('./client');
const _ = require('lodash');

const DEFAULT_REPLICANT_OPTS = { defaultValue: null, persistent: false };

class HedgebotExtension
{
    init(nodecg)
    {
        this.nodecg = nodecg;
        this.replicants = {};
        this.client = null;
        this.alreadyConnected = false;

        nodecg.log.info("Initializing Hedgebot bundle");


        // Creating replicants
        this.replicants.connected = nodecg.Replicant("connected", "hedgebot", DEFAULT_REPLICANT_OPTS);
        this.replicants.lastRefresh = nodecg.Replicant("lastRefresh", "hedgebot", DEFAULT_REPLICANT_OPTS);
        this.replicants.scheduleCurrent = nodecg.Replicant("scheduleCurrent", "hedgebot", DEFAULT_REPLICANT_OPTS);
        this.replicants.scheduleNext = nodecg.Replicant("scheduleNext", "hedgebot", DEFAULT_REPLICANT_OPTS);
        this.replicants.schedule = nodecg.Replicant("schedule", "hedgebot", DEFAULT_REPLICANT_OPTS);
        this.replicants.timers = nodecg.Replicant("timers", "hedgebot", DEFAULT_REPLICANT_OPTS);
        this.replicants.serverOffset = nodecg.Replicant("serverOffset", "hedgebot", DEFAULT_REPLICANT_OPTS);

        nodecg.log.info("Starting Hedgebot client...");
        this.client = new Client(nodecg.bundleConfig.client, nodecg.log);
        this.client.on('connected', this.onConnect.bind(this));
        this.client.on('disconnected', this.onDisconnect.bind(this));
        this.client.on('horaro/itemchange', this.onScheduleUpdate.bind(this));
        this.client.on('horaro/schedulerefresh', this.onScheduleUpdate.bind(this));
        this.client.on('horaro/scheduleupdate', this.onScheduleUpdate.bind(this));
        this.client.on('timer/*', this.onTimerUpdate.bind(this));
        
        this.client.initEventListener();
    }

    fetchTimers()
    {
        let timerList = {};
        let fetchedIds = [];
        let promises = [];
        let timerCount = 0;

        this.nodecg.log.info("Fetching timer status: " + Object.values(this.nodecg.bundleConfig.timers).join(", "));

        // Fetching timers
        for(let type in this.nodecg.bundleConfig.timers) {
            let timerId = this.nodecg.bundleConfig.timers[type];
            let prom = this.client.query("/plugin/timer", "getTimerById", [timerId])
                .then((timer) => {
                    timerCount++;
                    fetchedIds.push(timer.id);
                    timerList[type] = timer;
                });
            
            promises.push(prom);
        }

        Promise.all(promises).then(() => {
            this.nodecg.log.info("Fetched " + timerCount + " timers: " + fetchedIds.join(", "));
            this.replicants.timers.value = timerList;

            this.fetchServerOffset();
        });
    }

    fetchServerOffset()
    {
        // Fetching server time and computing offset with local time
        this.client.query("/plugin/timer", "getLocalTime")
            .then(this.setServerOffset.bind(this));
    }

    fetchCurrentSchedule()
    {
        this.nodecg.log.info("Fetching current schedule...");

        this.client.query("/plugin/horaro", "getCurrentSchedule", [this.nodecg.bundleConfig.channel])
            .then((schedule) => {
                if(schedule) {
                    let currentItem = _.cloneDeep(schedule.currentItem);
                    let nextItem = _.cloneDeep(schedule.nextItem);

                    currentItem = this.formatItemData(currentItem, schedule);
                    nextItem = this.formatItemData(nextItem, schedule);

                    this.replicants.scheduleCurrent.value = currentItem;
                    this.replicants.scheduleNext.value = nextItem;
                    this.replicants.schedule.value = schedule;

                    this.nodecg.log.info("Fetched schedule.");
                } else {
                    this.nodecg.log.info("No schedule returned by the API.");
                }
            });
    }

    formatItemData(item, schedule)
    {
        let formattedData = {};

        schedule.data.columns.forEach((column, index) => {
            let columnData = item.data[index];
            let linkData = this.parseLinks(columnData);
            
            if(linkData != null) {
                columnData = linkData;
            }

            formattedData[column] = columnData;
        });

        item.data = formattedData;

        return item;
    }

    parseLinks(markdown)
    {
        let entities = markdown.matchAll(/\[(.+)\]\((.+)\)/g);

        let output = {
            clean: markdown,
            titles: [],
            links: []
        };

        
        for(let entity of entities) {
            output.clean = output.clean.replace(entity[0], entity[1]);
            output.titles.push(entity[1]);
            output.links.push(entity[2]);
        }

        if(output.titles.length == 0) {
            return null;
        }

        return output;
    }

    setServerOffset(serverTime)
    {
        let localTime = new Date();
        let remoteTime = new Date(serverTime.time);
        remoteTime.setMilliseconds(serverTime.msec);
        
        let timeDiff = localTime - remoteTime;
        
        this.nodecg.log.info("Fetched remote server time: " + serverTime.time + ' (' + serverTime.msec + 'ms)');
        this.nodecg.log.info("Time diff w/ server is " + timeDiff + " ms");

        this.replicants.serverOffset.value = timeDiff;
    }

    onConnect(e)
    {
        if(!this.alreadyConnected) {
            this.nodecg.log.info("Connected to event relay.");
            this.nodecg.log.info("Fetching initial data...");

            this.alreadyConnected = true;

            this.fetchCurrentSchedule();
            this.fetchTimers();
        }

        this.replicants.connected.value = true;
    }

    onDisconnect(e)
    {
        this.replicants.connected.value = false;
    }

    onScheduleUpdate(data)
    {
        if(!this.replicants.schedule.value || data.schedule.identSlug == this.replicants.schedule.value.identSlug) {
            let currentItem = _.cloneDeep(data.schedule.currentItem);
            let nextItem = _.cloneDeep(data.schedule.nextItem);
    
            currentItem = this.formatItemData(currentItem, data.schedule);
            nextItem = this.formatItemData(nextItem, data.schedule);
    
            this.replicants.scheduleCurrent.value = currentItem;
            this.replicants.scheduleNext.value = nextItem;
            this.replicants.schedule.value = data.schedule;
        }
    }

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

module.exports = HedgebotExtension;