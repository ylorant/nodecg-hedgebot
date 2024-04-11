class RemoteTimersPanel extends BasePanel
{
    init()
    {
        this.elements.timerTemplate = document.querySelector('#timer-template');
        this.elements.timers = document.querySelector("#timers");
        this.elements.serverOffset = document.querySelector('#server-offset');

        this.registerReplicant('remoteTimers', this.onTimersUpdate.bind(this));
        this.registerReplicant('serverOffset', this.onServerOffsetUpdate.bind(this));

        setInterval(this.refreshTimersInterval.bind(this), 250);
    }

    getTimerElapsedTime(startTime, offset = 0, paused = false, started = false)
    {
        let elapsed = offset;

        if(started && !paused) {
            let now = new Date();
            let currentTimestamp = now.getTime() - this.replicants.serverOffset.value;
            elapsed += (currentTimestamp / 1000) - startTime;
        }

        return elapsed;
    }

    /**
     * Formats a timer's current time.
     */
    formatTimerTime(elapsed, milliseconds = false, showEmptyUnits = true, minimumUnits = 1)
    {
        let output = "";

        let totalSeconds = elapsed >= 0 ? Math.floor(elapsed) : Math.ceil(elapsed);
        let hours, minutes, seconds;

        hours = totalSeconds / 3600;
        hours = elapsed >= 0 ? Math.floor(hours) : Math.ceil(hours);
        minutes = totalSeconds / 60 - (hours * 60);
        minutes = elapsed >= 0 ? Math.floor(minutes) : Math.ceil(minutes);
        seconds = totalSeconds - (minutes * 60) - (hours * 3600);
        seconds = elapsed >= 0 ? Math.floor(seconds) : Math.ceil(seconds);

        let components = [hours, minutes, seconds];
        components = components.map(function(el) {
            return Math.abs(el).toString().padStart(2, "0");
        });

        // Remove empty units if asked
        if(!showEmptyUnits) {
            while (components.length > minimumUnits) {
                if (parseInt(components[0]) != 0) {
                    break;
                }

                components.shift();
            }

            // Remove leading zeroes from the first unit, while keeping a 0 if the time is actually 0
            components[0] = components[0].replace(/^0+/g, '');
            components[0] = components[0].length == 0 ? "0" : components[0];
        }

        output += components.join(":");

        if(milliseconds && Math.abs(elapsed) < 60) {
            let ms = Math.abs(Math.round((elapsed - totalSeconds) * 10));
            output += "." + ms;
        }
        
        return output;
    }

    /** Trigers a (re-)render of the given timer */
    renderTimer(timer)
    {
        // Remove all existing timers for the given key
        let timerElements = this.elements.timers.querySelectorAll('.timer');
        for(let element of timerElements) {
            if(timer.key == element.dataset.key) {
                this.elements.timers.removeChild(element);
            }
        }

        // Create the timer and fill the basic info
        let newTimer = this.elements.timerTemplate.cloneNode(true);
        newTimer.id = null;
        newTimer.dataset.key = timer.key;
        newTimer.querySelector('.timer-title').innerText = timer.name;

        this.elements.timers.appendChild(newTimer);
        this.updateTimer(timer, newTimer);
    }

    /** Only updates the time(s) in the given timer element with the given timer info */
    updateTimer(timerInfo, element)
    {
        let elapsed = this.getTimerElapsedTime(
            timerInfo.startTime, 
            timerInfo.offset, 
            timerInfo.paused, 
            timerInfo.started
        );

        let timerFormattedTime = this.formatTimerTime(elapsed);

        element.querySelector('.timer-value').innerText = timerFormattedTime;
        element.classList.remove('timer-started', 'timer-ended', 'timer-paused');

        if(timerInfo.started) {
            element.classList.add('timer-started');
        } else if(timerInfo.offset && timerInfo.offset != 0) {
            element.classList.add('timer-ended');
        }

        if(timerInfo.paused) {
            element.classList.add('timer-paused');
        }

        // Update current split
        let splitTime = "--:--";
        let splitTimeDifference;
        let splitTimeDifferenceClass;
        let showSplit = timerInfo.started || timerInfo.offset;

        if (showSplit) {
            if (timerInfo.currentSplitStartTime != -1) {
                splitTime = this.formatTimerTime(timerInfo.currentSplitStartTime, false, false, 2);
            }
            
            if (timerInfo.currentSplitStartTime != -1 && timerInfo.currentSplitReferenceStartTime != -1) {
                splitTimeDifference = timerInfo.currentSplitStartTime - timerInfo.currentSplitReferenceStartTime;
                splitTimeDifferenceClass = splitTimeDifference <= 0 ? "ahead" : "behind";

                splitTimeDifference = this.formatTimerTime(splitTimeDifference, true, false);
            }
        }

        element.querySelector('.timer-current-split-name').innerText = timerInfo.currentSplitName ? timerInfo.currentSplitName : "-";
        element.querySelector('.timer-current-split-time').innerText = splitTime;

        let splitTimeDifferenceElement = element.querySelector('.timer-current-split-time-difference');
        splitTimeDifferenceElement.innerText = splitTimeDifference ?? (showSplit ? "-" : "");
        splitTimeDifferenceElement.classList.remove('ahead', 'behind');
        splitTimeDifferenceElement.classList.add(splitTimeDifferenceClass);
    }

    /** Interval, each 500ms, update the timers' display */
    refreshTimersInterval()
    {
        for(let timerId in this.replicants.remoteTimers.value) {
            let timer = this.replicants.remoteTimers.value[timerId];
            let timerElement = this.elements.timers.querySelector('[data-key="' + timer.key + '"]');
            this.updateTimer(timer, timerElement);
        }
    }

    onTimersUpdate(timers)
    {
        let availableTimerKeys = [];

        for (let timerId in timers) {
            let timer = this.replicants.remoteTimers.value[timerId];
            availableTimerKeys.push(timer.key);

            // Try to find the timer and update it, or create it if not existing
            let timerElement = this.elements.timers.querySelector('[data-key="' + timer.key + '"]');
            if(timerElement) {
                this.updateTimer(timers[timerId], timerElement);
            } else {
                this.renderTimer(timers[timerId]);
            }
        }

        // Remove deleted timers
        let timerElements = this.elements.timers.querySelectorAll('[data-key]');
        for (let element of timerElements) {
            if (!availableTimerKeys.includes(element.dataset.key)) {
                this.elements.timers.removeChild(element);
            }
        }
    }

    onServerOffsetUpdate(newServerOffset)
    {
        this.elements.serverOffset.innerText = newServerOffset + " ms";
    }
}