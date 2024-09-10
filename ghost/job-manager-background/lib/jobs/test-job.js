const workerpool = require('workerpool');

// a deliberately inefficient implementation of the fibonacci sequence
async function add({a, b}) {
    if (!a || !b) {
        throw new Error('Invalid input');
    }
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000)); // Random delay
    return a + b;
}

// create a worker and register public functions
workerpool.worker({
    testEntryJob: add
});