class MainPanel extends BasePanel
{
    init()
    {
        this.elements.connectStatus = document.querySelector('#connect-status');
        this.registerReplicant('connected', this.setConnected.bind(this));
    }

    setConnected(status)
    {
        let connectColor, connectStatus;
    
        if(status == true) {
            connectStatus = "Connected";
            connectColor = "green";
        } else {
            connectStatus = "Disconnected";
            connectColor = "red";
        }
    
        this.elements.connectStatus.innerHTML = connectStatus;
        this.elements.connectStatus.style.color = connectColor;
    }
}
