import AuthenticatedRoute from 'ghost/routes/authenticated';

var PostsPostRoute = AuthenticatedRoute.extend({
    model: function (params) {
        var post = this.modelFor('posts').findBy('id', params.post_id);

        if (!post) {
            this.transitionTo('posts.index');
        }

        return post;
    }
});

export default PostsPostRoute;
