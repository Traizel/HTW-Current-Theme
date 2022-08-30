import PageManager from './page-manager';
import jQuery from 'jquery';

export default class Blog extends PageManager {
	constructor(context) {
		super();
		this.initBlogTags();
	}
	initBlogTags() {
		const blogNavigation = document.querySelector('.blog-nav');
		if (!blogNavigation) {
			return;
		}
		this.showTagNavigation(blogNavigation)
		const url = 'https://api.heattransferwarehouse.com/htw/blog/tags';
		jQuery.ajax({
			url: url,
			method: 'GET',
			success: (data) => {
				const tags = this.sortBlogTags(this.mapBlogTags(data));
				this.injectBlogNavigation(blogNavigation, tags);
				blogNavigation.classList.remove('loading');
				blogNavigation.classList.add('loaded');
				this.expandListener(blogNavigation);
			},
			error: (xhr, status, err) => {
				this.rmoveTagNavigation(blogNavigation);
				console.log(xhr);
				console.log(status);
				console.log(err);
			}
		});
	}
	showTagNavigation(blogNavigation) {
		blogNavigation.classList.add('loading');
		blogNavigation.style.display = '';
	}
	rmoveTagNavigation(blogNavigation) {
		blogNavigation.parentElement.removeChild(blogNavigation);
	}
	sortBlogTags(tags) {
		return tags.sort((a, b) => {
			if (a.postCount < b.postCount) {
				return 1;
			}
			if (a.postCount > b.postCount) {
				return -1;
			}
			return 0;
		});
	}
	mapBlogTags(tags) {
		return tags.map(t => {
			return {
				tag: t.tag,
				postCount: t.post_ids.length,
				url: `/blog/tag/${t.tag.replace(' ', '+')}`
			}
		})
	}
	injectBlogNavigation(blogNavigation, tags) {
		const blogTags = blogNavigation.querySelector('.blog-tags');
		if (!blogTags) {
			blogTags = document.createElement('ul');
			blogTags.className = 'blog-tags';
			blogNavigation.appendChild(blogTags);
		}
		tags.forEach(t => {
			const li = document.createElement('li');
			li.className = 'tag';
			const a = document.createElement('a');
			a.href = t.url;
			a.textContent = `${t.tag} (${t.postCount})`;
			li.appendChild(a);
			blogTags.appendChild(li);
		});
	}
	expandListener(blogNavigation) {
		const expander = blogNavigation.querySelector('.expand');
		expander.addEventListener('click', () => {
			if (blogNavigation.classList.contains('expanded')) {
				blogNavigation.classList.remove('expanded');
				expander.querySelector('.expand-text').textContent = 'More';
			} else {
				blogNavigation.classList.add('expanded');
				expander.querySelector('.expand-text').textContent = 'Less';
			}
		})
	}
}
