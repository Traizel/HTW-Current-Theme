import $ from 'jquery';

const constructPostImg = (blog) => {
	const postImgWrapper = document.createElement('div');
	const postImg = document.createElement('img');
	const postLink = document.createElement('a');
	postImgWrapper.className = 'productBlogPost-img-wrapper';
	postImg.className = 'productBlogPost-img';
	postImg.src = blog.img_url;
	postLink.href = blog.url;
	postLink.target = '_blank';
	postLink.appendChild(postImg);
	postImgWrapper.appendChild(postLink);
	return postImgWrapper;
};

const constructPostTitle = (blog) => {
	const postTitle = document.createElement('h4');
	const postLink = document.createElement('a');
	postTitle.className = 'productBlogPost-title';
	postLink.href = blog.url;
	postLink.target = '_blank';
	postLink.innerText = blog.title;
	postTitle.appendChild(postLink)
	return postTitle;
};

const constructBlogPost = (blog) => {
	const post = document.createElement('div');
	post.className = 'productBlogPost-item';
	const postImg = constructPostImg(blog);
	const postTitle = constructPostTitle(blog);
	post.appendChild(postImg);
	post.appendChild(postTitle);
	return post;
};

const constructBlogPostList = (selector, tabContent) => {
	const list = document.querySelector(selector);
	if (list) {
		return list;
	}
	const postList = document.createElement('div');
	postList.className = 'productBlogPost-list';
	tabContent.appendChild(postList);
	return postList;
};

const applyProductBlogs = (blogs) => {
	const tabs = document.querySelectorAll(`[data-tab-blog]`);
	const tabContent = document.getElementById(`tab-blog`);
	const blogPostList = constructBlogPostList('.productBlogPost-list', tabContent);
	blogs.map(b => (constructBlogPost(b))).forEach(blogEl => {
		blogPostList.appendChild(blogEl);
	});
	tabs.forEach(tab => {
		tab.style.display = '';
	});
};

export const asyncFetchProductBlogs = (blogIds) => {
	if (blogIds.length === 0) {
		return false;
	}
	// const api_base_url = window.origin.indexOf('localhost') > -1 ? 'http://localhost:4000' : 'https://api.heattransferwarehouse.com';
	const api_base_url = 'https://api.heattransferwarehouse.com';
	$.ajax({
		url: `${api_base_url}/htw/blogs?ids=${blogIds.join(',')}`,
		complete: data => {
			if (data.status < 300) {
				const responseJSON = data.responseJSON || JSON.parse(data.responseText);
				if (responseJSON.length > 0) {
					applyProductBlogs(responseJSON);
				}
			}
		}
	});
};
