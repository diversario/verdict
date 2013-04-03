var app = require('../')
  , request = require('supertest');



describe('DEFAULT EXPRESS APIS: GET /users', function() {
  it('respond with json', function(done){
    request(app)
      .get('/users')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        done();
      });
  })
});


describe('POST /api/v1/login', function() {
  it('successful login responds with 302', function(done) {
    request(app)
      .post('/api/v1/login')
      .send({'email': 'user@site.com', 'password': '123'})
      .set('Content-Type', 'application/json')
      .expect(302)
      .expect('Location', '/home')
      .end(done);
  });

  it('failed login responds with 401', function(done) {
    request(app)
      .post('/api/v1/login')
      .send({'email': 'wrong!', 'password': '123'})
      .set('Content-Type', 'application/json')
      .expect(401)
      .expect({'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid email/password'}})
      .end(done);
  })
});


describe('GET /logout', function() {
  it('responds with 302', function(done) {
    request(app)
      .get('/logout')
      .expect(302)
      .expect('Location', '/')
      .end(done);
  });
});



describe('POST /api/v1/vote:', function() {
  it('valid vote, no comment', function(done) {
    request(app)
      .post('/api/v1/vote')
      .send({'item': 1, 'rating': 3})
      .expect(204)
      .end(done);
  });
  
  it('valid vote, with comment', function(done) {
    request(app)
      .post('/api/v1/vote')
      .send({'item': 1, 'rating': 5, 'comment': 'tastes like vomit'})
      .expect(204)
      .end(done);
  });
  
  it('already voted item', function(done) {
    request(app)
      .post('/api/v1/vote')
      .send({'item': 1, 'rating': 3})
      .expect(200)
      .expect({'error': {'code': 'DUPLICATE_ENTRY', 'message': 'Already voted'}})
      .end(done);
  });

  it('invalid vote', function(done) {
    request(app)
      .post('/api/v1/vote')
      .send({'empty object': true, 'not really': '1'})
      .expect(200)
      .expect({'error': {'code': 'BAD_ENTRY', 'message': 'Invalid vote'}})
      .end(done);
  });

  it('invalid vote ID', function(done) {
    request(app)
      .post('/api/v1/vote')
      .send({'item': -1, 'rating': 0})
      .expect(200)
      .expect({'error': {'code': 'BAD_ITEM_ID', 'message': 'Invalid vote'}})
      .end(done);
  });

  it('invalid rating value', function(done) {
    request(app)
      .post('/api/v1/vote')
      .send({'item': -1, 'rating': 9001})
      .expect(200)
      .expect({'error': {'code': 'RATING_OUT_OF_RANGE', 'message': 'Invalid vote'}})
      .end(done);
  });

  it('non-existent vote', function(done) {
    request(app)
      .post('/api/v1/vote')
      .send({'item': 'nope', 'rating': 5})
      .expect(200)
      .expect({'error': {'code': 'MISSING_ENTRY', 'message': 'Invalid vote'}})
      .end(done);
  });

  it('server error', function(done) {
    request(app)
      .post('/api/v1/vote')
      .send({'item': 2, 'rating': 5})
      .expect(500)
      .expect({'error': {'code': 'SYSTEM_FAILURE', 'message': 'Vote cannot be processes at this time.'}})
      .end(done);
  });
});




/**
 * NB: item may include rating and vote count.
 * Optional: only users who voted on this item can see the rating, to lessen vote bias.
 */
describe('GET /api/v1/item*', function () {
  it('returns item details', function (done) {
    request(app)
      .get('/api/v1/item/1')
      .expect(200)
      .expect({
        'ok': true,
        'item': {'id': 1, 'provider': 'McDonald\'s', 'desc': 'Chicken McTesticles', 'type': 'lunch', 'added': new Date()}
      })
      .end(done);
  });

  it('returns default set of items', function (done) {
    request(app)
      .get('/api/v1/items')
      .expect(200)
      .end(function (err, res) {
        assert(res.statusCode == 200);
        assert(items.length == 10);
        throw new Error('Figure out default response for /items')
      });
  });

  it('returns list of items between dates', function (done) {
    request(app)
      .get('/api/v1/items')
      .data({'query': {'key': 'added', 'start': new Date(), 'end': new Date()}})
      .expect(200)
      .end(function (err, res) {
        assert(res.statusCode == 200);
        assert(items.length == 1);
      });
  });

  it('returns list of items between IDs', function (done) {
    request(app)
      .get('/api/v1/items')
      .data({'query': {'key': 'id', 'start': 1, 'end': 3}})
      .expect(200)
      .end(function (err, res) {
        assert(res.statusCode == 200);
        assert(items.length == 1);
      });
  });

  it('hard-caps number of items', function (done) {
    request(app)
      .get('/api/v1/items')
      .data({'query': {'key': 'id', 'start': 1, 'end': 200}})
      .expect(200)
      .end(function (err, res) {
        assert(res.statusCode == 200);
        assert(items.length == 100);
      });
  });
});




describe('GET /api/v1/user', function () {
  it('returns current user\'s data', function (done) {
    request(app)
      .get('/api/v1/user')
      .expect(200)
      .expect({'ok': true, 'user': {'id': 1, 'email': 'user@site.com', 'name': 'User Name'}})
      .end(done);
  });
});




describe('PUT /api/v1/user', function () {
  it('modifies current user\'s name', function (done) {
    request(app)
      .put('/api/v1/user')
      .send({'name': 'Different User Name'})
      .expect(200)
      .expect({'ok': true, 'user': {'id': 1, 'email': 'user@site.com', 'name': 'Different User Name'}})
      .end(done);
  });
  
  it('modifies current user\'s password', function (done) {
    request(app)
      .put('/api/v1/user')
      .send({'password': ['new password', 'new password']})
      .expect(200)
      .expect({'ok': true, 'user': {'id': 1, 'email': 'user@site.com', 'name': 'User Name'}})
      .end(done);
  });

  it('modifies current user\'s email', function (done) {
    request(app)
      .put('/api/v1/user')
      .send({'email': 'new@email.com', 'password': ['new password', 'new password']})
      .expect(200)
      .expect({'ok': true, 'user': {'id': 1, 'email': 'new@email.com', 'name': 'User Name'}})
      .end(done);
  });

  it('modifies current user\'s password and name', function (done) {
    request(app)
      .put('/api/v1/user')
      .send({'name': 'New Name', 'password': ['new password', 'new password']})
      .expect(200)
      .expect({'ok': true, 'user': {'id': 1, 'email': 'user@site.com', 'name': 'New Name'}})
      .end(done);
  });

  it('rejects email change with non-matching passwords', function (done) {
    request(app)
      .put('/api/v1/user')
      .send({'email': 'newemail@mail.com', 'password': ['right password', 'wrong password']})
      .expect(401)
      .expect({'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid email/password'}})
      .end(done);
  });

  it('rejects password change with non-matching passwords', function (done) {
    request(app)
      .put('/api/v1/user')
      .send({'password': ['one password', 'another password']})
      .expect(401)
      .expect({'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid email/password'}})
      .end(done);
  });

  it('rejects password change with missing passwords', function (done) {
    request(app)
      .put('/api/v1/user')
      .send({'password': ['another password']})
      .expect(401)
      .expect({'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid email/password'}})
      .end(done);
  });
});




describe('DELETE /api/v1/user', function () {
  it('removes current user account from the system and redirects to /', function (done) {
    request(app)
      .delete('/api/v1/user')
      .send({'password': 'valid'})
      .expect(302)
      .end(done);
  });
  
  it('rejects account deletion with invalid password');
  it('rejects account deletion with missing password');
  it('rejects account deletion from non-logged-in user');
});



describe('GET /api/v1/admin/item/1', function () {
  it('returns an item with ');
});


describe('POST /api/v1/admin/item', function () {
  it('creates a new item');
});

describe('PUT /api/v1/admin/item/1', function () {
  it('updates an item');
});

describe('DELETE /api/v1/admin/item/1', function () {
  it('removes an item');
});