use strict;
use warnings;
use utf8;

use File::Temp qw(tempfile);
use FindBin qw($Bin);
use Test::More tests => 14;
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

	local $coordinator->{name} = 'Living Room & "Café"';
	is(
		$builder->build_url_data()->{args}->{default_zone},
		'zone=Living%20Room%20%26%20%22Caf%C3%A9%22&',
		'URL builder encodes the default-zone argument'
	);
	is(
		$explicit_builder->build_url_data()->{args}->{default_zone},
		'zone=Living%20Room%20%26%20%22Caf%C3%A9%22&',
		'default-zone argument is independent of the selected zone'
	);
	my $template = Sonos::HTTP::Template->new(
		$system, "$Bin/../html/black/index.html", { mpath => 'A:ALBUM' }
	);
	my $output = $template->output();
	like( $output, qr/var zone_arg = "";/, 'unselected zone remains empty in the page' );
	like(
		$output,
		qr/var default_zone_arg = "zone=Living%20Room%20%26%20%22Caf%C3%A9%22&";/,
		'page provides an escaped default-zone argument'
	);
	like( $output, qr/var music_arg = "mpath=A%3AALBUM&";/, 'page preserves the music query argument' );
}
