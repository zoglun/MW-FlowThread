var canpost = mw.config.exists('canpost');
var replyBox = null;

function createThread(post) {
  var thread = new Thread();
  var object = thread.object;
  thread.init(post);

  if (canpost) {
    thread.addButton('reply', mw.msg('flowthread-ui-reply'), function() {
      thread.reply();
    });
  }

  // User not signed in do not have right to vote
  if (mw.user.getId() !== 0) {
    var likeNum = post.like ? '(' + post.like + ')' : '';
    thread.addButton('like', mw.msg('flowthread-ui-like') + likeNum, function() {
      if (object.find('.comment-like').attr('liked') !== undefined) {
        thread.dislike();
      } else {
        thread.like();
      }
    });
    thread.addButton('report', mw.msg('flowthread-ui-report'), function() {
      if (object.find('.comment-like').attr('reported') !== undefined) {
        thread.dislike();
      } else {
        thread.report();
      }
    });
  }

  // commentadmin-restricted and poster himself can delete comment
  if (mw.config.exists('commentadmin') || (post.userid && post.userid === mw.user.getId())) {
    thread.addButton('delete', mw.msg('flowthread-ui-delete'), function() {
      thread.delete();
    });
  }

  if (post.myatt === 1) {
    object.find('.comment-like').attr('liked', '');
  } else if (post.myatt === 2) {
    object.find('.comment-report').attr('reported', '');
  }

  return thread;
}

Thread.prototype.reply = function() {
  if (replyBox) {
    replyBox.remove();
  }
  replyBox = createReplyBox(this.post.id);
  this.appendChild({object: replyBox});
}

Thread.sendComment = function(postid, text, wikitext) {
  var api = new mw.Api();
  var req = {
    action: 'flowthread',
    type: 'post',
    pageid: mw.config.get('wgArticleId'),
    postid: postid,
    content: text,
    wikitext: wikitext
  };
  api.get(req).done(reloadComments).fail(function(error) {
    alert(error);
  });
}

function reloadComments(offset) {
  offset = offset || 0;
  var api = new mw.Api();
  api.get({
    action: 'flowthread',
    type: 'list',
    pageid: mw.config.get('wgArticleId'),
    offset: offset
  }).done(function(data) {
    $('.comment-container').html('');
    data.flowthread.posts.forEach(function(item) {
      if (item.parentid === '') {
        $('.comment-container').append(createThread(item).object);
      } else {
        Thread.fromId(item.parentid).appendChild(createThread(item));
      }
    });
    pager.current = Math.floor(offset / 10);
    pager.count = Math.ceil(data.flowthread.count / 10);
    pager.repaint();
  });
}

function setFollowUp(postid, follow) {
  var obj = $('[comment-id=' + postid + '] > .comment-post');
  obj.after(follow);
}

function createReplyBox(parentid) {
  var replyBox = new ReplyBox().object;
  var textarea = replyBox.find('textarea');
  var submit = replyBox.find('.comment-submit');
  var useWikitext = replyBox.find('[name=wikitext]');
  submit.click(function() {
    var text = textarea.val().trim();
    if (!text) {
      alert(mw.msg('flowthread-ui-nocontent'));
      return;
    }
    textarea.val('');
    Thread.sendComment(parentid, text, useWikitext[0].checked);
  });
  return replyBox;
}

/* Paginator support */
function Paginator() {
  this.object = $('<div class="comment-paginator"></div>');
  this.current = 0;
  this.count = 1;
}

Paginator.prototype.add = function(page) {
  var item = $('<span>' + (page + 1) + '</span>');
  if (page === this.current) {
    item.attr('current', '');
  }
  item.click(function() {
    reloadComments(page * 10);
  });
  this.object.append(item);
}

Paginator.prototype.addEllipse = function() {
  this.object.append('<span>...</span>')
}

Paginator.prototype.repaint = function() {
  this.object.html('');
  if (this.count === 1) {
    this.object.hide();
  } else {
    this.object.show();
  }
  var pageStart = Math.max(this.current - 2, 0);
  var pageEnd = Math.min(this.current + 4, this.count - 1);
  if (pageStart !== 0) {
    this.add(0);
  }
  if (pageStart > 1) {
    this.addEllipse();
  }
  for (var i = pageStart; i <= pageEnd; i++) {
    this.add(i);
  }
  if (this.count - pageEnd > 2) {
    this.addEllipse();
  }
  if (this.count - pageEnd !== 1) {
    this.add(this.count - 1);
  }
}

var pager = new Paginator();

$('#bodyContent').after('<div class="comment-container"></div>', pager.object, function(){
  if (canpost) return createReplyBox('');
  var noticeContainer = $('<div>').addClass('comment-bannotice');
  noticeContainer.html(config.CantPostNotice);
  return noticeContainer;
}());
reloadComments();