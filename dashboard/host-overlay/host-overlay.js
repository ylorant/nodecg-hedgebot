class HostOverlayPanel extends BasePanel
{
    init()
    {
        this.currentTimerToggleTimeout = null;

        this.elements.hostList = document.querySelector("#host-list");
        this.elements.hostTemplate = document.querySelector("#host-template");
        this.elements.hostAdd = document.querySelector("#add-host");
        this.elements.saveButton = document.querySelector("#save");
        this.elements.toggleButton = document.querySelector("#toggle");
        this.elements.timerToggleButton = document.querySelector("#timer-toggle");

        this.elements.hostAdd.addEventListener('click', this.onAddHost.bind(this));
        this.elements.saveButton.addEventListener('click', this.onSave.bind(this));
        this.elements.toggleButton.addEventListener('click', this.onToggleShow.bind(this));
        this.elements.timerToggleButton.addEventListener('click', this.onTimerToggleShow.bind(this));

        this.registerReplicant('hostInfo', this.reloadHostInfo.bind(this), []);
        this.registerReplicant('hostShow', this.reloadHostToggle.bind(this), false);

        let timerDuration = this.nodecg.bundleConfig.hosts.displayTime / 1000;
        this.elements.timerToggleButton.querySelector('#timer-duration').innerText = "(" + timerDuration + " sec)";
    }

    // Replicant events

    reloadHostInfo(hostInfo)
    {
        // Remove all children
        while (this.elements.hostList.firstChild) {
            this.elements.hostList.removeChild(this.elements.hostList.firstChild);
        }

        for(let host of hostInfo) {
            this.onAddHost(null, host.name, host.title);
        }
    }

    reloadHostToggle(hostToggle)
    {
        let iconClasses = this.elements.toggleButton.querySelector('i').classList;
        
        if(hostToggle == true) {
            this.elements.toggleButton.classList.remove('btn-dark')
            this.elements.toggleButton.classList.add('btn-info');
            iconClasses.remove('fa-eye-slash')
            iconClasses.add('fa-eye');
        } else {
            this.elements.toggleButton.classList.remove('btn-info')
            this.elements.toggleButton.classList.add('btn-dark');
            iconClasses.remove('fa-eye');
            iconClasses.add('fa-eye-slash');
        }
    }

    // Button events

    onSave()
    {
        let hostList = [];

        for(let i = 0; i < this.elements.hostList.children.length; i++) {
            let hostRootNode = this.elements.hostList.children[i];
            
            hostList.push({
                name: hostRootNode.querySelector('[name="name"]').value,
                title: hostRootNode.querySelector('[name="title"]').value
            });
        }

        this.replicants.hostInfo.value = hostList;
        this.replicants.hostShow.value = false;
    }

    onToggleShow(value = null)
    {
        if(typeof value == "boolean") {
            this.replicants.hostShow.value = !!value;
        } else {
            this.replicants.hostShow.value = !this.replicants.hostShow.value;
        }

        if(this.currentTimerToggleTimeout) {
            clearTimeout(this.currentTimerToggleTimeout);
            this.currentTimerToggleTimeout = null;
            this.elements.timerToggleButton.classList.remove('disabled');
        }
    }

    onTimerToggleShow()
    {
        if(this.currentTimerToggleTimeout === null) {
            this.onToggleShow(true);
            this.elements.timerToggleButton.classList.add('disabled');
            this.currentTimerToggleTimeout = setTimeout(
                this.onToggleShow.bind(this, false), 
                this.nodecg.bundleConfig.hosts.displayTime
            );
        }
    }

    onAddHost(event, name = null, title = null)
    {
        let newHost = this.elements.hostTemplate.cloneNode(true);
        newHost.removeAttribute('id');

        newHost.querySelector('[name="name"]').value = name;
        newHost.querySelector('[name="title"]').value = title;

        newHost.querySelector('.move-up').addEventListener('click', this.onMoveUpHost.bind(this, newHost));
        newHost.querySelector('.move-down').addEventListener('click', this.onMoveDownHost.bind(this, newHost));
        newHost.querySelector('.delete').addEventListener('click', this.onDeleteHost.bind(this, newHost));
        
        this.elements.hostList.appendChild(newHost);

    }

    onMoveUpHost(host)
    {
        if(host.previousElementSibling)
            host.parentNode.insertBefore(host, host.previousElementSibling);
    }

    onMoveDownHost(host)
    {
        if(host.nextElementSibling)
            host.parentNode.insertBefore(host.nextElementSibling, host);  
    }

    onDeleteHost(host)
    {
        this.elements.hostList.removeChild(host);
    }
}