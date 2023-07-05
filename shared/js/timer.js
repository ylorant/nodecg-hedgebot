/**
 * Timer class. Handles formatting timer data from its replicant and updating the timer HTML elements.
 */
class Timer
{
    /** Constructor */
    constructor(timer, serverOffset, elements)
    {
        this.serverOffset = serverOffset;
        this.elements = elements;
        this.timer = timer;
    }

    /** Allows to update the elements that are managed by this timer */
    setElements(elements)
    {
        this.elements = elements;
    }

    /** Gets the timer elapsed time in milliseconds */
    getTimerElapsedTime(startTime, offset = 0, paused = false, started = false, countdownAmount = null)
    {
        var elapsed = offset;

        if(started && !paused) {
            var now = new Date();
            var currentTimestamp = now.getTime() - this.serverOffset;
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

    /** Formats a timer's current time. */
    formatTimerTime(elapsed, milliseconds = false)
    {
        var output = "";

        var totalSeconds = Math.floor(elapsed);

        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor(totalSeconds / 60 - (hours * 60));
        var seconds = Math.floor(totalSeconds - (minutes * 60) - (hours * 3600));

        var components = [hours, minutes, seconds];
        components = components.map(function(el) {
            return '<i>' + el.toString().padStart(2, "0").split('').join('</i><i>') + '</i>';
        });
        output = components.join(":");

        if(milliseconds) {
            var ms = Math.round(($elapsed - totalSeconds) * 1000);
            output += ".<i>" + ms.split('').join('</i><i>') + "</i>";
        }

        return output;
    }

    /** Updates the timer from its internal data or its given data if provided. */
    update(timer = null)
    {
        if (timer) {
            this.timer = timer;
        }

        for (let element of this.elements) {
            let playerName = element.dataset.player;

            // Handle player if present and their timer is actually elapsed
            if(playerName && this.timer.players[playerName].elapsed) {
                if(!element.classList.contains('timer-ended')) {
                    element.classList.remove('timer-started', 'timer-paused');
                    element.classList.toggle('timer-ended', true);
                    element.innerHTML = this.formatTimerTime(timer.players[playerName].elapsed);
                }
            } else { // Global timer
                let elapsed = this.getTimerElapsedTime(
                    this.timer.startTime,
                    this.timer.offset,
                    this.timer.paused,
                    this.timer.started,
                    this.timer.countdownAmount
                );

                let readableTime = this.formatTimerTime(elapsed, false);
                element.innerHTML = readableTime;

                element.classList.remove('timer-started', 'timer-ended', 'timer-paused');
        
                if(this.timer.started) {
                    element.classList.toggle('timer-started', true);
                } else if(this.timer.offset != 0) {
                    element.classList.toggle('timer-ended', true);
                }
        
                if(this.timer.paused) {
                    element.classList.toggle('timer-paused', true);
                }
            }
        }
    }
}