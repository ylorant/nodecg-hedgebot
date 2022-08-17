const DEFAULT_REPLICANT_OPTS = { defaultValue: null, persistent: true };

class BasePanel
{
    constructor(nodecg)
    {
        this.nodecg = nodecg;
        this.elements = {};
        this.replicants = {};
    }

    registerReplicant(name, updateCallback, defaultValue = null)
    {
        let opts = Object.assign({}, DEFAULT_REPLICANT_OPTS);

        if(defaultValue !== null) {
            opts.defaultValue = defaultValue;
        }

        this.replicants[name] = this.nodecg.Replicant(name, "hedgebot", DEFAULT_REPLICANT_OPTS);
        this.replicants[name].on('change', updateCallback);
    }
}