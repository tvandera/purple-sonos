use v5.36;
use strict;
use warnings;

use File::Temp qw( tempdir );
use JSON::XS qw( decode_json );
use LWP::UserAgent;
use POSIX qw( WNOHANG );
use Test::More;
use Time::HiRes qw( sleep time );

my $cache_dir = tempdir( CLEANUP => 1 );
$ENV{XDG_CACHE_HOME} = $cache_dir;
chdir $cache_dir or die "Cannot enter $cache_dir: $!";

my $daemon_pid = fork();
die "Cannot fork sonod: $!" unless defined $daemon_pid;
if ( !$daemon_pid ) {
    exec $^X, '/opt/sonos/bin/sonod';
    die "Cannot start sonod: $!";
}

END {
    local $?;
    if ($daemon_pid) {
        kill 'TERM', $daemon_pid;
        waitpid( $daemon_pid, 0 );
    }
}

my $http = LWP::UserAgent->new( timeout => 2 );
my $deadline = time + 60;
my ( $players, $last_response );
while ( time < $deadline ) {
    if ( waitpid( $daemon_pid, WNOHANG ) == $daemon_pid ) {
        my $status = $?;
        undef $daemon_pid;
        BAIL_OUT("sonod exited before discovery completed (status $status)");
    }
    my $response = $http->get('http://127.0.0.1:9999/api?what=zones');
    $last_response = $response->status_line;
    if ( $response->is_success ) {
        my $data = eval { decode_json( $response->decoded_content ) };
        if ( ref($data) eq 'ARRAY' && @$data == 2 ) {
            $players = $data;
            last;
        }
        $last_response = $@ || $response->decoded_content;
    }
    sleep 0.25;
}

ok( $players, 'sonod discovers and populates both simulator players over SSDP' );
unless ($players) {
    diag( 'Last API response: ' . ( $last_response // 'none' ) );
    done_testing();
    exit 1;
}

is_deeply(
    [ sort map { $_->{name} } @$players ],
    [ 'Bedroom', 'Living Room' ],
    'the discovered rooms match the simulator S2 household',
);
my %ids = map { $_->{id} => 1 } @$players;
is( scalar keys %ids, 2, 'the discovered players have distinct device IDs' );
like( $_->{id}, qr/^RINCON_/, "$_->{name} has a Sonos device ID" ) for @$players;

done_testing();