import { PendingRequest } from "lib/graphql";

export function isPendingRequest(status?: PendingRequest | null) {
    if (!status) {
        return false
    }
    return status !== PendingRequest.None;
}