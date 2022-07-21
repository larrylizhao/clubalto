module.exports = class Status {
    constructor() {
        this.running = false;
        this.timesTried = 0;
        this.result = '';
        this.weekends = '';
        this.end = '';
    }

    static getInstance() {
        if(!this.instance) {
            this.instance = new Status();
        }
        return this.instance;
    }

    run(weekends, end) {
        this.running = true;
        this.timesTried = 0;
        this.weekends = `Checking time slots within ${weekends}`;
        this.end = `It will check until ${new Date(end)}`;
    }

    update(result) {
        this.timesTried++;
        this.result = result;
    }

    isRunning() {
        return this.running;
    }

    stop() {
        this.running = false;
    }

    getStatus() {
        return {
            running: this.running,
            timesTried: this.timesTried,
            weekends: this.weekends,
            end: this.end,
            result: this.result
        }
    }
}

