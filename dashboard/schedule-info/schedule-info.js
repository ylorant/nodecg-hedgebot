class ScheduleInfoPanel extends BasePanel
{
    init()
    {
        this.elements.currentItemInfo = document.querySelector('#currentItemInfo');
        this.elements.nextItemInfo = document.querySelector('#nextItemInfo');

        this.registerReplicant('scheduleCurrent', this.updateItemInfo.bind(this, "current"));
        this.registerReplicant('scheduleNext', this.updateItemInfo.bind(this, "next"));
    }

    updateItemInfo(itemType, itemInfo)
    {
        let infoNode = null;

        if(itemType == "next") {
            infoNode = this.elements.nextItemInfo;
        } else {
            infoNode = this.elements.currentItemInfo;
        }

        // Remove all children
        while (infoNode.firstChild) {
            infoNode.removeChild(infoNode.firstChild);
        }

        for(let key in itemInfo.data) {
            let li = document.createElement("li");
            let value = itemInfo.data[key];
            let valueAsText = value;
            
            if(value && typeof value == "object") {
                valueAsText = value.titles.join(", ");
            }
            
            li.innerText = key + ": " + valueAsText;

            infoNode.appendChild(li);
        }
    }
}