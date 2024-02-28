import {AsyncLocalStorage} from 'async_hooks';

type ValueDiposer<T> = (value: T) => void;

interface HttpContextValue<T> {
    value: T;
    dispose: ValueDiposer<T>;
}

type AsyncLocalStorageMap = Map<string, HttpContextValue<any>>;

const noopDisposeValue = () => {};

class HttpContext {
    private asyncLocalStorage: AsyncLocalStorage<AsyncLocalStorageMap>;

    constructor() {
        this.asyncLocalStorage = new AsyncLocalStorage<AsyncLocalStorageMap>();
    }

    start(fn: () => void): void {
        this.asyncLocalStorage.run(new Map(), fn);
    }

    get<T>(key: string): T | undefined {
        const store = this.asyncLocalStorage.getStore();

        return store?.get(key)?.value;
    }

    set<T>(key: string, value: T, dispose: ValueDiposer<T> = noopDisposeValue): void {
        const store = this.asyncLocalStorage.getStore();

        store?.set(key, {value, dispose});
    }

    end(): void {
        const store = this.asyncLocalStorage.getStore();

        store?.forEach(({dispose, value}) => dispose(value));
    }
}

export default new HttpContext();
