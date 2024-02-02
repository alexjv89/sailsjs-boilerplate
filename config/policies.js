/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

/***************************************************************************
*                                                                          *
* Default policy for all controllers and actions, unless overridden.       *
* (`true` allows public access)                                            *
*                                                                          *
***************************************************************************/

var policies={
	regular_controllers:{
		AuthController:{
			'*':true
		},
		WebhookController:{
			'*':true
		},
		MainController:{
			selectOrg: ['isAuthenticated'],
			createOrg: ['isAuthenticated'],
			landingPage: true,
		},
		OrgController:{
			'*':['isAuthenticated','canAccessThisOrg'],
			'createOrg':['isAuthenticated']
		},
		SettingsController:{
			'*':['isAuthenticated','canAccessThisOrg'],
		},
		UserSettingsController:{
			'*':['isAuthenticated'],
		},
		BullController:{
			'*':['isAuthenticated','isAdmin']
		},
		
	},
	// blueprint controllers
	blueprint_controllers:{   
		MemberController:{
			'*':false,
		},
		UserController:{
			'*':'hasValidAPISecretKey',
		},
	},
	default:{
		'*': false,
	}
}

var _ = require("lodash");
module.exports.policies = _.merge(
	policies.default,
	policies.regular_controllers,
	policies.blueprint_controllers,
);