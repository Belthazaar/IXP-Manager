<?php $this->layout( 'layouts/ixpv4' );
/** @var object $t */
?>

<?php $this->section( 'page-header-preamble' ) ?>
Faucet Configuration Generator
<?php $this->append() ?>



<?php $this->section( 'content' ) ?>

<!-- <iframe id="if-phpinfo"
            style="border: none; height: 100%; width: 100%;"
            src="<?= route( 'phpinfo' ) ?>"></iframe> -->

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h3>Faucet config generator and tester</h3>
    
</div>
<div class="container-fluid">
    <div class="col-sm-12">
        <div class="row">
            <div class="col-12">
                <div class="row tw-my-6">
                    <h4>Faucet Configuration Generator </h4>
                </div>
                <div class="row tw-mb-6">
                    <p>Generates a Faucet config and runs a network simulation to check and verify that all hosts can communicate with one another and all switches have redundancy paths </p>
                </div>
                <div class="row tw-mb-6">
                    <a class="btn btn-white ml-2" type="button" onclick="display()"> Generate configs </a>
                </div>
                <div id="toAdd">
                </div>
            </div>
        </div>
    </div>
</div>

<?php $this->append() ?>


<?php $this->section( 'scripts' ) ?>

<script type="text/javascript" src="js/faucet.js"></script>

<?php $this->append() ?>