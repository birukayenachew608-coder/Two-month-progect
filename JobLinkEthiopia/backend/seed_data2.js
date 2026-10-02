const pool = require('./config/db');
pool.query("UPDATE job_seekers SET profile_photo_url = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80' WHERE id = 67")
.then(() => { console.log('Updated Photo'); process.exit(0); })
.catch(err => console.error(err));
