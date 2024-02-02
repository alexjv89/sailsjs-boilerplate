var async = require('async');

var Bull = require( 'bull' );
var crawlerQueue = new Bull('crawler',{redis:sails.config.bull.redis});
var queue = new Bull('queue',{redis:sails.config.bull.redis});

var axios = require('axios');
// const { ClientCredentials, ResourceOwnerPassword, AuthorizationCode } = require('simple-oauth2');
// const zohoInvoiceAdmin_config = {
// 	client: {
// 		id:  process.env.ZOHO_ADMIN_CLIENT_ID,
// 		secret: process.env.ZOHO_ADMIN_CLIENT_SECRET
// 	},
// 	auth: {
// 		tokenHost: `${process.env.ZOHO_TOKEN_HOST_URL}`,
// 		tokenPath: '/oauth/v2/token',
// 		authorizePath: '/oauth/v2/auth',
// 	}
// };
// const zoho_admin = new AuthorizationCode(zohoInvoiceAdmin_config);

const moment = require('moment-timezone');

module.exports={
	adminLanding:function(req,res){
		var locals={title:'Admin'};
		res.view('admin/landing_page',locals);
	},
	listOrgs:function(req,res){
		var locals={};
		async.auto({
			getAllOrgs:function(callback){
				Org.find({}).sort('createdAt DESC').populate('members').exec(callback);
			},
			getMembership:function(callback){
				Member.find({user:req.user.id}).exec(callback);
			}
		},function(err,results){
			results.getAllOrgs.forEach(function(org){
				org.is_member=false;
				results.getMembership.forEach(function(m){
					if(m.org==org.id && m.user==req.user.id)
						org.is_member=true;
				})
			})
			var locals={
				orgs:results.getAllOrgs,
				memberships:results.getMembership,
			}

			// locals.orgs.forEach(function(firm){
			// 	firm.mrr=0;
			// 	firm.gstins.forEach(function(gstin){
			// 		firm.mrr+=gstin.mrr;
			// 	});
			// })
			res.view('admin/list_orgs',locals);
		})
	},
	createOrg:function(req,res){
		var locals={
			org:{},
		};
		if(req.body){
			console.log(req.body);
			// create firm
			// add this user as the client
			async.auto({
				createOrg:function(callback){
					Org.create(req.body).fetch().exec(callback);
				},
				createMembershipForUser:['createOrg',function(results,callback){
					var member={
						type:'albert_agent',
						user:req.user.id,
						org:results.createOrg.id,
					}
					Member.create(member).exec(callback);
				}]
			},function(err,results){
				if (err)
					throw err;
				res.redirect('/admin/orgs');
			})
		}else{
			res.view('admin/create_org',locals);
		}	
	},
	
	ignoreEmail:function(req,res){
		var now = new Date();
		var pe_id=req.body.pe_id?req.body.pe_id:'';
		console.log(pe_id);
		if(pe_id=='')
			return res.send(400,'bad request');
		async.auto({
			getParsedEmail:async function(){
				var pe = await Parsed_email.findOne({id:pe_id});
				if(pe.stage =='complete')
					throw new Error('stage_already_complete');
				else 
					return pe;
			},
			updateParsedEmail:['getParsedEmail',async function(results){
				var to_update = {
					stage:'complete',
					status:'ignore',
					details:results.getParsedEmail.details || {},
				}
				var current_stage = results.getParsedEmail.stage;
				if(current_stage != 'complete')
					_.set(to_update,'details.timestamps.'+current_stage,now);
				return await Parsed_email.updateOne({id:pe_id},to_update);
			}],
			createEvent:['getParsedEmail',async function(results){
				var stages = ['parse','post_process','complete'];
				var current_stage = results.getParsedEmail.stage;
				var prev_stage = GeneralService.prevStage(stages,current_stage);
				var prev_stage_completed_at = new Date(_.get(results.getParsedEmail,'details.timestamps.'+prev_stage,results.getParsedEmail.createdAt));
				// var new_stage=GeneralService.nextStage(stages,prev_stage);
				
				var data = {
					time_taken:now-prev_stage_completed_at,
					cumulative_time_taken:now-new Date(results.getParsedEmail.createdAt),
					req_user_id:req.user.id,
					app_name:process.env.APP_NAME,
					object_type:'parsed_email',
					stage:current_stage,
					completed_at:now,
				}
				return await EventService.add('completed_stage',data);
			}]
			// Send event to mark the time taken for this
		},function(err,results){
			if(err){
				if(err.message=='stage_already_complete')
					return res.send(400,'Completed stage cannot be ignored.');
				else 
					res.handleError(err);
			}
			else
				res.send(200,'ok');
		})
		
	},
	listUsers:function(req,res){
		async.auto({
			getUsers:async function(){
				return await User.find()
					.populate('memberships')
					.sort('name ASC');
			},
			getRelatedOrgs:['getUsers',async function(results){
				var org_ids = [];
				results.getUsers.forEach(function(user){
					user.memberships.forEach(function(member){
						org_ids.push(member.org);
					})
				})
				var orgs= await Org.find({id:org_ids});
				return orgs;
			}]
		},function(err,results){
			if(err)
				res.handleError(err);
			var locals={
				users:results.getUsers,
			}
			locals.users.forEach(function(user){
				user.memberships.forEach(function(member){
					member.org=_.find(results.getRelatedOrgs,{id:member.org});
				})
			});
			res.view('admin/list_users',locals);
		})
	},
	createUser:function(req,res){
		var locals={
			error:false,
			user:{}
		};
		if(req.body){
			console.log(req.body);
			req.body.email = req.body.email.toLowerCase();
			async.auto({
				findUser:function(callback){
					User.findOne({email:req.body.email}).exec(function(err,user){
						if(user)
							return callback('user with this email already exists');
						else
							return callback(err);
					})
				},
				generateToken: ['findUser', function(results, cb){
					var jwt = require('jsonwebtoken');
					jwt.sign({
						email: req.body.email,
						for:'set_password'
					}, 
					sails.config.password_reset_secret, 
					{expiresIn: 60*60*24*30},  //valid for 30 days
					cb);
				}],
				createUser:['findUser','generateToken',function(results,callback){
					var user={
						name:req.body.name,
						email:req.body.email,
						password:Math.random().toString(36).replace(/[^a-z]+/g, ''),
						details:{
							set_password_token:{
								token:results.generateToken,
								valid:true // once the token is used, the token will be made invalid
							}
						}
					}
					User.create(user).fetch().exec(callback);
				}],
				sendEmail:['createUser',async function(results){
					var data={
						title:'Create new user email',
						options:{
							template:'admin_create_user',
							name:req.body.name,
							email:req.body.email,
							token:results.generateToken,
						},
						info:{}
					};
					return await queue.add('send_transactional_email',data);
				}],
			},function(err,results){
				if (err){
					if(typeof err =='string'){
						locals.error=err;
						locals.user.name=req.body.name;
						locals.user.email=req.body.email;
						res.view('admin/create_user',locals);
					}else{
						throw err;
					}
				}
				res.redirect('/admin');
			})
		}else{
			res.view('admin/create_user',locals);
		}
	},
	
	
	restartRepeatJobs:function(req,res){
		var locals={};
		if(req.body){
			_.forEach(sails.config.bull.repeats, function (task) {
				if (task.active) {
					sails.config.queue.add(task.name, task.data, {
						repeat: task.repeat
					});
					sails.log.info(`bull repeatable job registered: ${task.name}`);
				}
			});
			res.redirect('/bull/cashflowy');
		}
		res.view('admin/restart_repeat_jobs',locals);
	},
	
	dbCheck:function (req,res){
		async.auto({
			getOneMarketingConnector:async function(){
				return await Marketing_connector.find().limit(1)
			}
		},function(err,results){
			if(err)
				return res.handleError(err);
			var response = {
				status:'success',
				message:'Connection test successful'
			}

			// if(req.query?.show_db == 'true'){
			// 	response.db = {
			// 		host: sails.config.datastores?.default?.host,
			// 		password: sails.config.datastores?.default?.password
			// 	}
			// }
			res.send(response);
		})
	},
	// this is used to add yourself as a member to any org. This can only be done by an admin user
	createMembership:function(req,res){
		async.auto({
			createMembership:async function(){
				var member={
					type:req.body.type,
					user:req.body.user_id,
					org:req.body.org_id,
				}
				return await Member.create(member).fetch();
				
			},
			
			findUser:['createMembership',async function(results){
				var user = await User.findOne({ where: {id: results.createMembership.user }, })
				return user
			}],
			findOrg:['createMembership',async function(results){
				var org = await Org.findOne({ where: {id: results.createMembership.org }, })
				return org
			}],	
			sendMail:['createMembership','findUser','findOrg', function(results, cb){
				var url = sails.config.app_url + '/org/'+ req.body.org_id;
				var opts={
					template:'add_user_to_org',
					to:results.findUser.email,
					from:'Cashflowy<no-reply@cashflowy.io>',
					subject: 'Add user to org',
					locals:{
						user: results.findUser,
						org:results.findOrg,
						url:url
					}
				}
				MailgunService.sendEmail(opts,function(err){
					cb(err)
				})
			}]
			
		},function(err,results){
			if(err)
				return res.handleError(err);
			res.send({success:'success'})
		});
	},
	revokeMembership:function(req,res){
		async.auto({
			revokeMembership:async function(){
				var filter = {
					org:req.body.org_id,
					user:req.body.user_id
				}
				return await Member.destroyOne(filter);
			}
		},function(err,results){
			if(err)
				return res.handleError(err);
			res.send({success:'success'})
		})
		
	},
}