<?php
/**
 * The view.php (required) is a visual output representation to user using data provided by query.php.
 * It generally should contain HTML between <body> and </body>.
 */
?>
<?php include( _i('inc/header.php') ); ?>

<h3><?php echo $pageTitle; ?></h3>
<?php
if(count($articles)){
	foreach($articles as $id => $a){
		$id++;
		$a = (object) $a;
	?>
		<p class="article">
			<h5><a href="<?php echo _url('blog', array($id, $a->slug)); ?>"><?php echo $a->title; ?></a></h5>
			<p><?php echo $a->body; ?></p>
			<p><a href="<?php echo _url('blog', array($id, $a->slug)); ?>" class="button mini green">Read More</a></p>
		</p>
	<?php
	}
	?>
	<div class="pager clearfix">
		<?php echo $pager->display(); ?>
		<div class="pagerRecords"><?php echo _t('Total %d records', $totalRecords); ?></div>
	</div>
	<?php
}else{
	?>
	<div class="noRecord"><?php echo _t('There is no record.'); ?></div>
	<?php
}
?>

<?php include( _i('inc/footer.php') ); ?>