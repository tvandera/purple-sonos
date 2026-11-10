use strict;
use warnings;

use Test::More;
use Sonos::System;

BEGIN { use_ok('Sonos::Player') };

can_ok('Sonos::Player', qw(new services getService));

subtest 'unavailable library roots have no children' => sub {
	my $system = bless { _players => {} }, 'Sonos::System';
	my $library = bless {
		_system => $system, _updateids => {}, _tree => {}, _items => {},
	}, 'Sonos::MusicLibrary';
	my $parent = Sonos::MetaData->new({
		id => 'A:ALBUM', 'upnp:class' => 'object.container.album.musicAlbum',
	});
	ok( !defined $library->playerForID('A:ALBUM'), 'unadvertised root has no owner' );
	is_deeply( [ $library->fetchChildren('A:ALBUM') ], [], 'does not browse without an owner' );
	is_deeply( [ $library->children($parent) ], [], 'unfetched root is safe to list' );
	$library->{_updateids}->{'A:ALBUM'} = [ 'offline-player', 1 ];
	is_deeply( [ $library->children($parent) ], [], 'offline library owner is safe to list' );
};

done_testing();
