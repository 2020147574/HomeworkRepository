var express = require('express');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
var app = express();

app.use(express.static('public'));

async function getDBConnection() {
    const db = await sqlite.open({
        filename: 'product.db',
        driver: sqlite3.Database
    });
    return db;
}

const fs = require('fs').promises;
const path = require('path');

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/', async function (req, res) {
    const db = await getDBConnection();
    const { keyword, arrange } = req.query;

    let query = 'SELECT * FROM movies';
    let conditions = [];
    let params = [];

    if (keyword) {
        conditions.push('(movie_title LIKE ? OR movie_overview LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    switch (arrange) {
        case 'scoredown':
            query += ' ORDER BY movie_rate DESC';
            break;
        case 'scoreup':
            query += ' ORDER BY movie_rate ASC';
            break;
        case 'datedown':
            query += ' ORDER BY movie_release_date DESC';
            break;
        case 'dateup':
            query += ' ORDER BY movie_release_date ASC';
            break;
    }

    const rows = await db.all(query, params);
    await db.close();

    let movieHTML = rows.map(row => `
        <div class="movie-card">
            <div class="poster-container">
                <a href="/movies/${row.movie_id}">
                    <img src="images/${row.movie_image}" alt="${row.movie_title}" />
                </a>
            </div>
            <h4>${row.movie_title}</h4>
            <p><strong>개봉일:</strong> ${row.movie_release_date}</p>
            <p><strong>평점:</strong> ${row.movie_rate}</p>
        </div>
    `).join('');

    var output = 
    `<!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8">
            <title>LAB5</title>
            <link rel = "stylesheet" type = "text/css" href = "main.css">
        </head>
        <body>
            <h1>인프밍 영화 정보 사이트입니다.</h1>
            <nav>
                <div class = "flex-container navigation">
                    <div class="navi"><a href = "/">메인페이지</a></div>
                    <div class="navi"><a href = "/login">로그인</a></div>
                    <div class="navi"><a href = "/signup">회원가입</a></div>
                </div>
            </nav> 
            <div class = "flex-container maincontent">
                <div class = "flex-container subtitle">
                    <form id="searchInput" method = "get" autocomplete = "off">
                        <p><input type = "text" name = "keyword" 
                            placeholder = "키워드를 입력하세요" autofocus />
                            <input type = "submit" value = "Filter results" />
                        </p>
                    </form>
                    <h3>Movies</h3>
                    <div class = "flex-container table">
                        <aside>
                            <label>정렬 기준:</label>
                            <form id="sortForm" method = "get" autocomplete = "off">
                                <p><label>
                                    <input name="arrange" type="radio" value="scoredown" onchange="this.form.submit()" ${arrange === 'scoredown' ? 'checked' : ''} />
                                    평점 내림차순
                                </label></p>
                                <p><label>
                                    <input name="arrange" type="radio" value="scoreup" onchange="this.form.submit()" ${arrange === 'scoreup' ? 'checked' : ''} />
                                    평점 오름차순
                                </label></p>
                                <p><label>
                                    <input name="arrange" type="radio" value="datedown" onchange="this.form.submit()" ${arrange === 'datedown' ? 'checked' : ''} />
                                    개봉 내림차순
                                </label></p>
                                <p><label>
                                    <input name="arrange" type="radio" value="dateup" onchange="this.form.submit()" ${arrange === 'dateup' ? 'checked' : ''} />
                                    개봉 오름차순
                                </label></p>
                            </form>
                        </aside>
                        <main id="movieList">${movieHTML}
                        </main>
                    </div>
                </div>
            </div>
        </body>
    </html>
    `;
    res.send(output);
});

app.get('/movies/:movie_id', async function (req, res) {
    const db = await getDBConnection();
    const { movie_id } = req.params;

    const movie = await db.get('SELECT * FROM movies WHERE movie_id = ?', [movie_id]);
    await db.close();

    let comments = [];
    try {
        const data = await fs.readFile(path.join(__dirname, 'comment.json'), 'utf-8');
        const allComments = JSON.parse(data);
        comments = allComments.filter(comment => comment.movie_id == movie_id);
    } catch (err) {
        console.error('댓글 파일 읽기 실패:', err);
    }

    const commentsHTML = comments.map(c => `
        <div class="comment">
            <p>${c.comment}</p>
        </div>
    `).join('');

    var output = `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8">
            <title>LAB5</title>
            <link rel = "stylesheet" type = "text/css" href = "/main.css">
        </head>
        <body>
            <h1>인프밍 영화 정보 사이트입니다.</h1>
            <nav>
                <div class = "flex-container navigation">
                    <div class="navi"><a href = "/">메인페이지</a></div>
                    <div class="navi"><a href = "/login">로그인</a></div>
                    <div class="navi"><a href = "/signup">회원가입</a></div>
                </div>
            </nav> 
            <div class = "flex-container maincontent">
                <div class = "flex-container boxtable">
                    <aside>
                        <img src="/images/${movie.movie_image}" alt="${movie.movie_title}" style="max-width:200px;" />
                    </aside>
                    <main class = info>
                        <p><strong>영화 ID:</strong> ${movie.movie_id}</p>
                        <h2><strong>영화 제목:</strong> ${movie.movie_title}</h2>
                        <p><strong>개봉일:</strong> ${movie.movie_release_date}</p>
                        <p><strong>평점:</strong> ${movie.movie_rate}</p>
                        <p><strong>줄거리:</strong> ${movie.movie_overview}</p>
                    </main>
                </div>
                <hr>
                <div>
                    <h3>영화 후기</h3>
                    ${commentsHTML || '<p>아직 후기가 없습니다.</p>'}
                    <form method = "post" action="/movies/${movie.movie_id}">
                        <p><input type = "text" name = "comment" 
                            placeholder = "후기를 작성하세요" autofocus />
                            <input type = "submit" value = "등록하기" />
                        </p>
                    </form>
                </div>                
            </div>
        </body>
    </html>
    `;
    res.send(output);
});

app.use(express.urlencoded({ extended: true }));

app.post('/movies/:movie_id', async function (req, res) {
    const { movie_id } = req.params;
    const { comment } = req.body;

    const commentFilepath = path.join(__dirname, 'comment.json');
    let comments = [];

    try {
        const data = await fs.readFile(commentFilepath, 'utf-8');
        comments = JSON.parse(data);
    } catch (err) {
        comments = [];
    }

    comments.push({
        movie_id: parseInt(movie_id),
        comment: comment
    });

    try {
        await fs.writeFile(commentFilepath, JSON.stringify(comments, null, 2), 'utf-8');
    } catch (err) {
        console.error('댓글 저장 실패:', err);
    }

    res.redirect(`/movies/${movie_id}`);
});

var port = 3000;

app.listen(port, function () {
    console.log('Server on! html://localhost: ' + port);
});