class Module
{
    static get id() { return ""; }

    constructor(manager)
    {
        this.DEFAULT_REPLICANT_OPTS = manager.DEFAULT_REPLICANT_OPTS;
        this.modules = manager.modules;
        this.nodecg = manager.nodecg;
        this.client = manager.client;
        this.replicants = {};
    }

    init()
    {
    }
}

module.exports = Module;