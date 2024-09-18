import { HTMLAttributes } from "react";

export default function Button(props: HTMLAttributes<HTMLButtonElement>) {
    return <button className="bg-blue-600 rounded-lg hover:bg-blue-700 text-white px-2 py-1" {...props} />;
}
