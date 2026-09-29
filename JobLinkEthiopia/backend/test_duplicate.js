const http = require('http');

const data = JSON.stringify({
    name: "Duplicate User",
    email: "testduplicate@example.com",
    password: "password123",
    role: "job_seeker"
});

const reqSeeker = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, res => {
    console.log(`Seeker registration: ${res.statusCode}`);
    
    // Now try to register employer
    const dataEmp = JSON.stringify({
        name: "Duplicate User",
        email: "testduplicate@example.com",
        password: "password123",
        role: "employer"
    });
    
    const reqEmp = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': dataEmp.length }
    }, res2 => {
        console.log(`Employer registration: ${res2.statusCode}`);
        res2.on('data', d => process.stdout.write(d));
    });
    reqEmp.write(dataEmp);
    reqEmp.end();
});

reqSeeker.write(data);
reqSeeker.end();
