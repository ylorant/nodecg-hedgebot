class TimersPanel extends BasePanel
{
    init()
    {
        this.elements.timerTemplate = document.querySelector('#timer-template');
        this.elements.timerRunnerTemplate = document.querySelector('#timer-runner-template');
        this.elements.timers = document.querySelector("#timers");
        this.elements.serverOffset = document.querySelector('#server-offset');

        this.registerReplicant('timers', this.onTimersUpdate.bind(this));
        this.registerReplicant('serverOffset', this.onServerOffsetUpdate.bind(this));

        setInterval(this.refreshTimersInterval.bind(this), 500);
    }

    getTimerElapsedTime(startTime, offset = 0, paused = false, started = false, countdownAmount = null)
    {
        var elapsed = offset;

        if(started && !paused) {
            var now = new Date();
            var currentTimestamp = now.getTime() - this.replicants.serverOffset.value;
            elapsed += (currentTimestamp / 1000) - startTime;
        }

        if(countdownAmount != null) {
            elapsed = (countdownAmount) - elapsed;

            if(elapsed < 0) {
                elapsed = 0;
            }

        }
        
        return elapsed;
    }

    /**
     * Formats a timer's current time.
     */
    formatTimerTime(elapsed, milliseconds = false)
    {
        var output = "";

        var totalSeconds = Math.floor(elapsed);

        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor(totalSeconds / 60 - (hours * 60));
        var seconds = Math.floor(totalSeconds - (minutes * 60) - (hours * 3600));

        var components = [hours, minutes, seconds];
        components = components.map(function(el) {
            return el.toString().padStart(2, "0");
        });
        output = components.join(":");

        if(milliseconds) {
            var ms = Math.round(($elapsed - totalSeconds) * 1000);
            output += "." + ms;
        }
        
        return output;
    }

    /** Trigers a (re-)render of the given timer */
    renderTimer(timer)
    {
        // Remove all existing timers
        let timerElements = this.elements.timers.querySelectorAll('.timer');
        for(let element of timerElements) {
            if(timer.id == element.dataset.id) {
                this.elements.timers.removeChild(element);
            }
        }

        // Create the timer and fill the basic info
        let newTimer = this.elements.timerTemplate.cloneNode(true);
        newTimer.id = null;
        newTimer.dataset.id = timer.id;
        newTimer.querySelector('.timer-title').innerText = timer.title;

        // Fill the runners
        if(timer.players && Object.keys(timer.players).length > 0) {
            for(let i in timer.players) {
                let player = timer.players[i];

                let newRunner = this.elements.timerRunnerTemplate.cloneNode(true);
                newRunner.id = null;
                newRunner.dataset.name = i;
                newRunner.querySelector('.timer-runner-title').innerText = player.player;
                newTimer.querySelector('.timer-runners').appendChild(newRunner);
            }
        }

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
            timerInfo.started,
            timerInfo.countdown ? timerInfo.countdownAmount : null,
        );

        let timerFormattedTime = this.formatTimerTime(elapsed);

        element.querySelector('.timer-value').innerText = timerFormattedTime;
        element.classList.remove('timer-started', 'timer-ended', 'timer-paused');

        if(timerInfo.started) {
            element.classList.add('timer-started');
        } else if(timerInfo.offset != 0) {
            element.classList.add('timer-ended');
        }

        if(timerInfo.paused) {
            element.classList.add('timer-paused');
        } 

        if(timerInfo.players && Object.keys(timerInfo.players).length > 0) {
            for(let i in timerInfo.players) {
                let runnerElement = element.querySelector('.timer-runner[data-name="' + i + '"]');
                
                runnerElement.classList.remove('timer-started');

                if(timerInfo.players[i].elapsed) {
                    runnerElement.classList.add('timer-ended');

                    let elapsed = this.formatTimerTime(timerInfo.players[i].elapsed);
                    runnerElement.querySelector('.timer-runner-value').innerText = elapsed;
                } else {
                    runnerElement.querySelector('.timer-runner-value').innerText = timerFormattedTime;

                    if(!timerInfo.started && timerInfo.offset != 0) {
                        runnerElement.classList.add('timer-ended');
                    }
                }
            }
        }
    }

    /** Interval, each 500ms, update the timers' display */
    refreshTimersInterval()
    {
        for(let timerId in this.replicants.timers.value) {
            let timer = this.replicants.timers.value[timerId];
            let timerElement = this.elements.timers.querySelector('[data-id="' + timer.id + '"]');
            this.updateTimer(timer, timerElement);
        }
    }

    onTimersUpdate(timers)
    {
        for(let timerId in timers) {
            // Try to find the timer and update it, or create it if not existing
            let timerElement = this.elements.timers.querySelector('[data-id="' + timerId + '"]');
            if(timerElement) {
                this.updateTimer(timers[timerId], timerElement);
            } else {
                this.renderTimer(timers[timerId]);
            }
        }  
    }

    onServerOffsetUpdate(newServerOffset)
    {
        this.elements.serverOffset.innerText = newServerOffset + " ms";
    }
}