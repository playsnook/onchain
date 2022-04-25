#!/usr/bin/perl

my @parts = split(/\./, $ARGV[0]);
my $contractName = $parts[0];
my $flatContractNameMultilicense = "${contractName}.lic";
my $flatContractName = "${contractName}-flat.sol";

`npx hardhat flatten contracts/${contractName}.sol > contracts-flat/$flatContractNameMultilicense`;
open(fh1, '<', "contracts-flat/$flatContractNameMultilicense") or die $!;
open(fh2, '>', "contracts-flat/$flatContractName") or die $!;

my $licenseCounter = 0;
while ($line = <fh1>) {
  if ($line =~ /\/\/\s*?SPDX-License*/ ) {
    if ($licenseCounter > 0) { 
      next;
    } else {
      $licenseCounter += 1;
    }
  }
  print fh2 "$line";
}

unlink("contracts-flat/$flatContractNameMultilicense");
print "All done\n";