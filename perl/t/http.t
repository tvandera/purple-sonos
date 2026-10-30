use strict;
use warnings;

use File::Temp qw(tempfile);
use Test::More tests => 9;
use Sonos::HTTP::Builder;
use Sonos::HTTP::Template;
use Sonos::System;

{
	package TestZonePlayer;

	sub cmp { $_[0]->{order} <=> $_[1]->{order} }
	sub zoneGroupTopology { return $_[0] }
	sub isCoordinator { return $_[0]->{is_coordinator} }
	sub zoneName { return $_[0]->{name} }
	sub lastUpdate { return 1 }
	sub TO_JSON { return { name => $_[0]->{name}, arg => "zone=$_[0]->{name}&" } }
}

{
	package TestMusicLibrary;

	sub TO_JSON { return {} }
}

BEGIN { use_ok('Sonos::HTTP') };

can_ok('Sonos::HTTP', qw(registerHandler validateRequest validateAction));

{
	my ( $handle, $diskpath ) = tempfile( SUFFIX => '.html', TMPDIR => 1, UNLINK => 1 );
	print {$handle} '<h1>[% title %]</h1>';
	close $handle or die "Could not close template: $!";

	no warnings 'redefine';
	local *Sonos::HTTP::Template::input = sub { return { title => 'Sonos' } };

	my $template = Sonos::HTTP::Template->new( undef, $diskpath, {} );
	is( eval { $template->output() }, '<h1>Sonos</h1>', 'renders a template using an absolute disk path' );
	diag $@ if $@;
}

{
	my $coordinator = bless {
		name           => 'Living Room',
		order          => 1,
		is_coordinator => 1,
	}, 'TestZonePlayer';
	my $satellite = bless {
		name           => 'Kitchen',
		order          => 2,
		is_coordinator => 0,
	}, 'TestZonePlayer';
	my $system = bless {
		_players      => { coordinator => $coordinator, satellite => $satellite },
		_musiclibrary => bless( {}, 'TestMusicLibrary' ),
	}, 'Sonos::System';

	is( $system->defaultPlayer(), $coordinator, 'system selects the coordinator as its default player' );

	my %query;
	my $builder = Sonos::HTTP::Builder->new( $system, \%query );
	is( $builder->qf('zone'), undef, 'builder leaves the missing zone out of the query' );
	is( $builder->build_url_data()->{args}->{zone}, '', 'builder does not add the default zone to URL arguments' );

	my $data = $builder->build_system_data();
	is( $data->{default_zone}, 'Living Room', 'system TO_JSON returns the system default zone name' );
	is_deeply( \%query, {}, 'builder does not mutate the query form' );

	my $explicit_builder = Sonos::HTTP::Builder->new( $system, { zone => 'Kitchen' } );
	is( $explicit_builder->qf('zone'), 'Kitchen', 'builder preserves an explicitly requested zone' );
}
