class CommentSystem {
    constructor() {
        this.user = new User();
        this.comments = this.loadCommentsFromStorage();
        this.currentSort = { field: 'date', order: 'asc' };
        this.randomUser = null;
    }

    loadCommentsFromStorage() {
        const comments = JSON.parse(localStorage.getItem('comments')) || [];
        return comments.map(comment => new Comment(comment));
    }

    saveCommentsToStorage() {
        localStorage.setItem('comments', JSON.stringify(this.comments));
    }

    async loadRandomUser() {
        this.randomUser = await this.user.fetchRandomUser();
        if (this.randomUser) {
            const userAvatar = document.getElementById('main-user-avatar');
            userAvatar.src = this.randomUser.picture.thumbnail;
            const mainUserName = document.getElementById('main-user-name');
            mainUserName.textContent = `${this.randomUser.name.first} ${this.randomUser.name.last}`;
        } else {
            alert("Не удалось загрузить данные пользователя. Пожалуйста, перезагрузите страницу.");
        }
    }

    async addComment() {
        const commentText = document.getElementById('new-comment-text').value.trim();
        if (!commentText) {
            alert("Комментарий не может быть пустым.");
            return;
        }
        if (commentText.length > 1000) {
            alert("Комментарий не может быть длиннее 1000 символов.");
            return;
        }
        if (!this.randomUser) {
            alert("Не удалось загрузить данные пользователя. Попробуйте снова.");
            return;
        }

        const newComment = new Comment({
            avatar: this.randomUser.picture.thumbnail,
            name: `${this.randomUser.name.first} ${this.randomUser.name.last}`,
            text: commentText,
            date: new Date(),
            id: Date.now(),
            votes: 0,
            favorites: false,
            parentId: null,
            replyNumber: 0,
            voteColor: 'black'
        });

        this.comments.push(newComment);
        this.saveCommentsToStorage();
        document.getElementById('new-comment-text').value = "";
        this.updateCharCount();
        this.adjustTextareaHeight();
        await this.refreshComments();
        await this.loadRandomUser();
    }

    saveComment(comment) {
        this.comments = this.comments.filter(c => c.id !== comment.id);
        this.comments.push(comment);
        this.saveCommentsToStorage();
    }

    async loadComments() {
        document.getElementById('comments-list').innerHTML = '';
        this.comments.forEach(comment => this.displayComment(comment));
    }

    displayComment(comment) {
        const existingComment = document.querySelector(`.comment-template[data-id="${comment.id}"], .reply-template[data-id="${comment.id}"]`);
        if (existingComment) {
            return;
        }

        const template = comment.parentId === null
            ? document.querySelector('.comment-template').cloneNode(true)
            : document.querySelector('.reply-template').cloneNode(true);

        template.style.display = 'block';
        template.setAttribute('data-id', comment.id);
        template.querySelector('.user-avatar').src = comment.avatar;
        template.querySelector('.user-name').textContent = comment.name;
        template.querySelector('.comment-text').textContent = comment.text;
        template.querySelector('.comment-date').textContent = this.formatDate(comment.date);
        template.querySelector('.vote-rating').textContent = comment.votes;
        template.querySelector('.upvote-button').addEventListener('click', () => this.upVote(comment.id));
        template.querySelector('.downvote-button').addEventListener('click', () => this.downVote(comment.id));
        template.querySelector('.vote-rating').style.color = comment.voteColor || 'black';

        const favoriteButton = template.querySelector('.favorite-button');
        favoriteButton.innerHTML = comment.favorites ? '&#9829; В избранном' : '&#9825; В избранное';
        favoriteButton.addEventListener('click', () => this.toggleFavorite(comment.id));

        const replyButton = template.querySelector('.reply-button');
        if (replyButton) {
            replyButton.addEventListener('click', () => this.toggleReplyForm(comment.id));

            const submitReplyButton = template.querySelector('.submit-reply');
            if (submitReplyButton) {
                submitReplyButton.addEventListener('click', () => this.reply(comment.id));
            }
        }

        if (comment.parentId === null) {
            document.getElementById('comments-list').appendChild(template);
            document.querySelector(`.comment-template[data-id="${comment.id}"] .replies-list`).innerHTML = "";
        } else {
            const parentCommentElement = document.querySelector(`.comment-template[data-id="${comment.parentId}"]`);
            console.log(`Looking for parent comment with id ${comment.parentId}`);
            if (parentCommentElement) {
                const parentCommentElementName = parentCommentElement.querySelector('.user-name')?.textContent;
                const parentCommentNameElement = template.querySelector('.parent-comment-name');

                if (parentCommentNameElement) {
                    parentCommentNameElement.textContent = parentCommentElementName;
                } else {
                    console.error("Parent comment name element not found in the template.", template);
                }

                const repliesList = parentCommentElement.querySelector('.replies-list');
                if (repliesList) {
                    repliesList.appendChild(template);
                    if (replyButton) {
                        replyButton.style.display = 'none'; // Hide the reply button on replies
                    }
                } else {
                    console.error("Replies list not found in the parent comment element.", parentCommentElement);
                }
            } else {
                console.error(`Parent comment with id ${comment.parentId} not found.`, template);
            }
        }
    }

    toggleReplyForm(id) {
        const commentElement = document.querySelector(`.comment-template[data-id="${id}"]`);
        if (commentElement) {
            const replyForm = commentElement.querySelector('.reply-form');
            replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
        } else {
            alert(`Comment with id ${id} not found.`);
        }
    }

    async reply(id) {
        const commentElement = document.querySelector(`.comment-template[data-id="${id}"]`);
        if (!commentElement) {
            alert(`Comment with id ${id} not found.`);
            return;
        }

        const replyText = commentElement.querySelector('.reply-text').value.trim();
        if (!replyText) {
            alert("Комментарий не может быть пустым.");
            return;
        }
        if (replyText.length > 1000) {
            alert("Комментарий не может быть длиннее 1000 символов.");
            return;
        }
        if (!this.randomUser) {
            alert("Не удалось загрузить данные пользователя. Попробуйте снова.");
            return;
        }

        const newReply = new Comment({
            avatar: this.randomUser.picture.thumbnail,
            name: `${this.randomUser.name.first} ${this.randomUser.name.last}`,
            text: replyText,
            date: new Date(),
            id: Date.now(),
            parentId: id,
            votes: 0,
            favorites: false,
            replyNumber: 0,
            voteColor: 'black'
        });

        this.saveComment(newReply);
        commentElement.querySelector('.reply-text').value = "";
        await this.refreshComments();
        await this.loadRandomUser();
    }

    updateCharCount() {
        const commentText = document.getElementById('new-comment-text').value;
        const charCount = commentText.length;
        const charCountDisplay = document.getElementById('char-count');
        const charWarning = document.getElementById('char-warning');
        const submitButton = document.getElementById('submit-comment');

        charCountDisplay.textContent = `${charCount} / 1000`;

        if (charCount > 1000) {
            charWarning.style.display = 'block';
            submitButton.disabled = true;
        } else {
            charWarning.style.display = 'none';
            submitButton.style.background = '#ABD873';
            submitButton.style.opacity = '1';
            submitButton.disabled = false;
        }
    }

    upVote(id) {
        let comment = this.comments.find(c => c.id === id);

        if (comment) {
            comment.votes++;
            comment.voteColor = comment.votes > 0 ? '#8AC540' : comment.votes < 0 ? '#FF0000' : 'black';
            this.saveCommentsToStorage();
            this.refreshComments();
        } else {
            console.error(`Comment with id ${id} not found for upvote.`);
        }
    }

    downVote(id) {
        let comment = this.comments.find(c => c.id === id);
        if (comment) {
            comment.votes--;
            comment.voteColor = comment.votes > 0 ? '#8AC540' : comment.votes < 0 ? '#FF0000' : 'black';
            this.saveCommentsToStorage();
            this.refreshComments();
        } else {
            console.error(`Comment with id ${id} not found for downvote.`);
        }
    }

    toggleFavorite(id) {
        const comment = this.comments.find(c => c.id === id);
        if (comment) {
            comment.favorites = !comment.favorites;
            this.saveCommentsToStorage();
            this.refreshComments();
        } else {
            console.error(`Comment with id ${id} not found for favorite toggle.`);
        }
    }

    sortComments(field, order) {

        const options = document.getElementById('sort-comments').options;
 
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === field) {
                options[i].classList.add('selected-option');
                console.log(options[i]);
            } else {
                options[i].classList.remove('selected-option');
            }
        }

        this.comments.sort((a, b) => {
            if (field === 'date') {

                return order === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
            }
            if (field === 'rating') {
                return order === 'asc' ? a.votes - b.votes : b.votes - a.votes;
            }
            if (field === 'replies') {
                const repliesA = this.comments.filter(comment => comment.parentId === a.id).length;
                const repliesB = this.comments.filter(comment => comment.parentId === b.id).length;
                return order === 'asc' ? repliesA - repliesB : repliesB - repliesA;
            }
            return 0;
        });
        this.refreshComments();
    }

    filterFavorites() {
        const favorites = this.comments.filter(comment => comment.favorites);
        document.getElementById('comments-list').innerHTML = '';
        favorites.forEach(comment => this.displayComment(comment));
    }

    async refreshComments() {
        document.getElementById('comments-list').innerHTML = '';
        const parentComments = this.comments.filter(comment => comment.parentId === null);
        const replies = this.comments.filter(comment => comment.parentId !== null);

        parentComments.forEach(parent => {
            this.displayComment(parent);
            const childComments = replies.filter(reply => reply.parentId === parent.id);
            childComments.forEach(reply => this.displayComment(reply));
        });
    }

    formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month} ${hours}:${minutes}`;
    }

    addSortEventListeners() {
        const sortCommentsElement = document.getElementById('sort-comments');
        const sortButtonElement = document.querySelector('.sort-button');
        const favoritesToggleElement = document.getElementById('favorites-toggle');

        if (sortCommentsElement) {
            sortCommentsElement.addEventListener('change', (event) => {
                this.currentSort.field = event.target.value;
                this.sortComments(this.currentSort.field, this.currentSort.order);
            });
        } else {
            console.error("Element 'sort-comments' not found.");
        }

        if (sortButtonElement) {
            sortButtonElement.addEventListener('click', () => {
                if (sortButtonElement.innerHTML === '&#9650;') { 
                    this.currentSort.order = 'asc';
                    this.sortComments(this.currentSort.field, this.currentSort.order);
                    this.toggleSortButton();
                } else {
                    this.currentSort.order = 'desc';
                    this.sortComments(this.currentSort.field, this.currentSort.order);
                    this.toggleSortButton();
                }
            });
        } else {
            console.error("Element '.sort-button' not found.");
        }

        if (favoritesToggleElement) {
            favoritesToggleElement.addEventListener('click', () => this.filterFavorites());
        } else {
            console.error("Element 'favorites-toggle' not found.");
        }
    }

    toggleSortButton() {
        const sortButtonElement = document.querySelector('.sort-button');
        console.log(sortButtonElement.innerHTML);
        if (sortButtonElement.innerHTML === '&#9650;') {
            sortButtonElement.innerHTML = '&#9660;'
        } else {
            sortButtonElement.innerHTML = '&#9650;'; 
        }
    }


    async init() {
        await this.loadRandomUser();
        document.getElementById('submit-comment').addEventListener('click', () => this.addComment());
        document.getElementById('new-comment-text').addEventListener('input', () => {
            this.updateCharCount();
            this.adjustTextareaHeight();
        });
        document.getElementById('clear-storage').addEventListener('click', () => {
            localStorage.removeItem('comments');
            this.comments = [];
            this.refreshComments();
        });

        this.addSortEventListeners();
        await this.loadComments();
    }

    adjustTextareaHeight() {
        const textarea = document.getElementById('new-comment-text');
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
}

const commentSystem = new CommentSystem();
commentSystem.init();
