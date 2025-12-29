export type IngestStatus = "idle" | "processing" | "error";

export interface IngestState {
    status: IngestStatus;
    file?: string;
    startedAt?: number;
    error?: string;
}

let state: IngestState = { status: "idle" };

export function getIngestState(): IngestState {
    return state;
}

export function startIngest(file: string): void {
    state = { status: "processing", file, startedAt: Date.now() };
}

export function failIngest(error: string): void {
    state = { status: "error", error };
}

export function finishIngest(): void {
    state = { status: "idle" };
}
