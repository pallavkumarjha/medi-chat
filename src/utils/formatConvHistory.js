export function formatConvHistory(messages) {
    return messages.map((message, i) => {
        // if message sender is 'user' then return 'User: ' + message else return 'Bot: ' + message
        if (message.sender === 'user') {
            return 'User: ' + message.text;
        } else {
            return 'Bot: ' + message.text;
        }
    }).join('\n')
}