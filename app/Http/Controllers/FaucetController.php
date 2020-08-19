<?php

/*
 * Copyright (C) 2009 - 2019 Internet Neutral Exchange Association Company Limited By Guarantee.
 * All Rights Reserved.
 *
 * This file is part of IXP Manager.
 *
 * IXP Manager is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, version v2.0 of the License.
 *
 * IXP Manager is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License v2.0
 * along with IXP Manager.  If not, see:
 *
 * http://www.gnu.org/licenses/gpl-2.0.html
 */
 
namespace IXP\Http\Controllers;
 
use App, Auth, D2EM;
 
use Illuminate\Http\{
   Request,
   RedirectResponse
};
 
use Illuminate\View\View;
 
use IXP\Utils\View\Alert\Alert;
use IXP\Utils\View\Alert\Container as AlertContainer;
 
use Illuminate\Auth\Access\AuthorizationException;
 
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
 
/**
 * Faucet Controller
 * @author     Christoff Visser <christoff@iij.ad.jp>
 * @category   Faucet
 * @copyright  Copyright (C) 2009 - 2019 Internet Neutral Exchange Association Company Limited By Guarantee
 * @license    http://www.gnu.org/licenses/gpl-2.0.html GNU GPL V2.0
 */
class FaucetController extends Controller
{
   public function index(): View
   {
       return view('faucet/faucet');
   }

   public function MxGraph(): View
   {
       return view('faucet/mxg');
   }
   
   public function generateConfig()
   {
        // $process = new Process("python3 /home/ixpman/hello.py");
        // $process->run();

        // // executes after the command finishes
        // if (!$process->isSuccessful()) {
        //     throw new ProcessFailedException($process);
        // }
        // $out = $process->getOutput();
        
        // // AlertContainer::push( $process->getOutput(), Alert::SUCCESS );
        // return $out;

        $out = $this->runIXPMFC();

        return $out;

   }

   public function runIXPMFC()
   {
       $process = new Process("bash /home/ixpman/code/networkTester/ixpman.sh");
       $process->run();

       if (!$process->isSuccessful()) {
           throw new ProcessFailedException($process);
       }
       $out = $process->getOutput();
       return $out;
   }

   public function getFaucetYaml()
   {
       $fpath = "/home/ixpman/code/networkTester/etc/faucet/faucet.yaml";
    //    $out = readfile("/home/ixpman/code/networkTester/etc/faucet/faucet.yaml");
        $file = fopen($fpath, "r");
        $out = fread($file, filesize($fpath));
        fclose($file);
       return $out;
   }

   public function getTopologyJson()
   {
       $fpath = "/home/ixpman/code/networkTester/etc/mixtt/topology.json";
       $file = fopen($fpath, "r");
       $out = fread($file, filesize($fpath));
       fclose($file);

    //    $out = readfile("/home/ixpman/code/networkTester/etc/mixtt/topology.json");
       return $out;
   }

   public function getXML()
   {
       $fpath = "/home/ixpman/code/networkTester/etc/mixtt/graph.xml";
       $file = fopen($fpath, "r") or die("Unable to open the file");
       $out = fread($file,filesize($fpath));
       fclose($file);
       return $out;
    //    $out = readfile("/home/ixpman/code/networkTester/etc/mixtt/topology.json");
    //    return $out;
   }

   public function getLatestLogs()
   {
    //    $out = readfile("/home/ixpman/code/networkTester/ixpman_files/output.txt");
        $fpath = "/home/ixpman/code/networkTester/ixpman_files/output.txt";
        $file = fopen($fpath, "r");
        $out = fread($file,filesize($fpath));
        fclose($file);
        return $out;
   }

   public function saveFaucet( Request $request) {
    // AlertContainer::push( "Faucet configuration successfully updated.", Alert::SUCCESS );
    file_put_contents("/home/ixpman/code/networkTester/etc/faucet/faucet.yaml", ($request->input('msg')));
    $out = readfile("/home/ixpman/code/networkTester/etc/faucet/faucet.yaml");
    // $out = $request;
    return $out;
   }

   public function saveTopo( Request $request) {
    file_put_contents("/home/ixpman/code/networkTester/etc/mixtt/topology.json", ($request->input('msg')));
    $out = readfile("/home/ixpman/code/networkTester/etc/mixtt/topology.json");
    // $out = $request;
    return $out;
   }

   public function saveXML( Request $request) {
    file_put_contents("/home/ixpman/code/networkTester/etc/mixtt/graph.xml", ($request->input('msg')));
    $out = readfile("/home/ixpman/code/networkTester/etc/mixtt/graph.xml");
    // $out = $request;
    return $out;
   }
}

