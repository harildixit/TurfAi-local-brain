const blocked = new Set(['set', 'create', 'update', 'delete', 'add', 'batch', 'bulkWriter', 'runTransaction', 'recursiveDelete', 'commit']);

// Defense in depth: even accidentally retained helpers cannot write remotely.
export function readOnlyFirestore<T extends object>(target: T): T {
  const cache = new WeakMap<object, object>();
  const wrap = (value: any): any => {
    if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
    if (value instanceof Promise) return value.then(wrap);
    if (cache.has(value)) return cache.get(value);
    const proxy = new Proxy(value, {
      get(object, key) {
        if (blocked.has(String(key))) return () => { throw new Error('Firestore writes are disabled in TurfAI local-brain'); };
        const item = Reflect.get(object, key, object);
        if (typeof item === 'function') return (...args: any[]) => wrap(item.apply(object, args));
        return wrap(item);
      },
      set() { throw new Error('Firestore objects are read-only'); },
    });
    cache.set(value, proxy);
    return proxy;
  };
  return wrap(target);
}
