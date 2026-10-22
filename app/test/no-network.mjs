globalThis.fetch = () => { throw new Error('Build attempted an external request'); };
