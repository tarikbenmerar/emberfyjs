var expect = chai.expect;
describe( 'Code Tests', function () {
	describe( 'Observers tests', function () {
		var obj = {}, obj1 = {}, attr_obj = 'attr_obj', attr_obs = 'attr_obs', attr_obj_ref = 'ref';
		describe( 'addObserver', function () {
			it( 'Integer and String observer / observed objects should be neglected and don\'t throw errors', function () {
				var firstCall = function () {
					Emberfy.addObserver( 3, '' );
				}
				expect( firstCall ).to.not.throw( Error );
				var secondCall = function () {
					Emberfy.addObserver( 3, '');
				}
				expect( firstCall ).to.not.throw( Error );
			});

			Emberfy.addObserver( obj, obj1, attr_obj, attr_obs, attr_obj_ref );
			it( 'The observed object should contain the observers attribute filled appropriately', function () {
				expect( obj ).to.contain.keys( 'observers' );	
			});

		});
	});
});