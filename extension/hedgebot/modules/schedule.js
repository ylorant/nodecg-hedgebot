const Module = require('./module');
const _ = require('lodash');

class ScheduleModule extends Module
{
    static get id() { return "Horaro"; }

    init()
    {
        this.replicants.scheduleCurrent = this.nodecg.Replicant("scheduleCurrent", "hedgebot", this.DEFAULT_REPLICANT_OPTS);
        this.replicants.scheduleNext = this.nodecg.Replicant("scheduleNext", "hedgebot", this.DEFAULT_REPLICANT_OPTS);
        this.replicants.schedule = this.nodecg.Replicant("schedule", "hedgebot", this.DEFAULT_REPLICANT_OPTS);

        this.client.on('horaro/itemchange', this.onScheduleUpdate.bind(this));
        this.client.on('horaro/schedulerefresh', this.onScheduleUpdate.bind(this));
        this.client.on('horaro/scheduleupdate', this.onScheduleUpdate.bind(this));

        this.fetchCurrentSchedule();
    }

    fetchCurrentSchedule()
    {
        this.nodecg.log.info("Fetching current schedule...");

        this.client.query("/plugin/horaro", "getCurrentSchedule", [this.nodecg.bundleConfig.channel, true])
            .then((schedule) => {
                if(schedule) {
                    this.storeSchedule(schedule);
                    this.nodecg.log.info("Fetched schedule: " + schedule.data.name);
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
        // Don't handle any type that isn't a string
        if(typeof markdown !== "string") {
            return markdown;
        }

        let entities = markdown.matchAll(/\[(.+?)\]\((.+?)\)/g);

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

    storeSchedule(schedule)
    {
        let currentItem = _.cloneDeep(schedule.currentItem);
        let nextItem = _.cloneDeep(schedule.nextItem);

        if (currentItem) {
            currentItem = this.formatItemData(currentItem, schedule);
        }

        if (nextItem) {
            nextItem = this.formatItemData(nextItem, schedule);
        }

        for(let item of schedule.data.items) {
            item = this.formatItemData(item, schedule);
        }

        this.replicants.scheduleCurrent.value = currentItem;
        this.replicants.scheduleNext.value = nextItem;
        this.replicants.schedule.value = schedule;
    }

    // Events //

    onScheduleUpdate(data)
    {
        if(!this.replicants.schedule.value || data.schedule.identSlug == this.replicants.schedule.value.identSlug) {
            this.storeSchedule(data.schedule);
        }
    }
}

module.exports = ScheduleModule;