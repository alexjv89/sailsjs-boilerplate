module.exports = function(req, res, next) {
	if (req.isAuthenticated()) {
		if(!req.user.is_verified)
			res.redirect('/verify_email');	
		return next();
	}
	else{
		var locals={
			title:'Login',
			description:'This page requires login',
			layout:'layout',
			pg:{}
		}
		res.set('hr_status','access_denied')
		// res.view('login_page',locals);
		res.redirect('/login?redirect='+encodeURIComponent(req.url));
	}
};
