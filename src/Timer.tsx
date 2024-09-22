import { StopwatchResult, useStopwatch } from "react-timer-hook";

export default function Timer({
    timerRef,
}: {
    timerRef: React.MutableRefObject<StopwatchResult | null>;
}) {
    const result = useStopwatch();

    timerRef.current = result;

    const { days, seconds, minutes, hours } = result;

    return (
        <div>
            <span>{days.toString().padStart(2, "0")}</span>:<span>{hours.toString().padStart(2, "0")}</span>:<span>{minutes.toString().padStart(2, "0")}</span>:
            <span>{seconds.toString().padStart(2, "0")}</span>
        </div>
    );
}
