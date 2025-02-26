declare module 'node-cron' {
    interface ScheduleOptions {
        scheduled?: boolean;
        timezone?: string;
    }

    interface Schedule {
        start: () => void;
        stop: () => void;
    }

    function schedule(
        expression: string,
        func: () => void,
        options?: ScheduleOptions
    ): Schedule;

    export { schedule };
}
