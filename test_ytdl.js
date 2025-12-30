const youtubedl = require('youtube-dl-exec');
const url = 'https://youtu.be/Bb5Qb7ziIig?si=E8nrlQeakN2ACZFn';

console.log('Testing youtube-dl-exec with URL:', url);

youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
})
.then(output => {
    console.log('Success!');
    console.log('Title:', output.title);
    console.log('Duration:', output.duration);
})
.catch(err => {
    console.error('Error occurred:');
    console.error(err);
});
