const workerpool = require('workerpool');

// a deliberately inefficient implementation of the fibonacci sequence
async function add({a, b}) {
    if (!a || !b) {
        throw new Error('Invalid input');
    }
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
    return a + b;
}

// create a worker and register public functions
workerpool.worker({
    testEntryJob: add
});