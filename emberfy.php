<?php

$widget_root = "./components/";

//TODO:Review the exact regular expression of a variable
//TODO:unless block
$var_match = '\w+';
$attr_match = $var_match.'(.'.$var_match.')*';

$patternIf = '#({{\#if\s+('.$attr_match.')}}|({{else}})|({{/if}}))#';
$ifStack = array();
function extractIfs($matches) {
    global $patternIf;
    global $ifStack;

    if($matches[2] != "") {
        array_push($ifStack, $matches[2]);        
        return "<div data-if='{$matches[2]}' style='padding:0px;margin:0px;display:none;'>";  
    }

    if($matches[4] != "") {
        return "</div><div data-else='{$ifStack[count($ifStack) -1]}' style='padding:0px;margin:0px;display:none;'>";
    }

    if($matches[5] != "") {
        array_pop($ifStack);
        return "</div>";
    }
}

function widget($name, $attr=array()) {
    $widget ="";
    global $widget_root;
    global $patternIf;
    global $var_match;
    global $attr_match;

    //Set the tagname
    if(isset($attr['tagName'])) {
        $tagName = $attr['tagName'];
    } else {
        $tagName = "div";
    }

    //Open the component file
    $component = join(file($widget_root.$name.".handlebars"), "\n");

    //Replace with block
    $component = preg_replace('/{{\#with\s+('.$attr_match.')}}/', '<div data-endpoint="with" data-var="${1}">', 
                               $component);
    $component = preg_replace('/{{[\/]with}}/', '</div>', $component);
   
    //Replace each block 
    $component = preg_replace('/{{\#each\s+('.$attr_match.')}}/', '<div data-endpoint="each" data-var="${1}">'.
                              '<script type="emberfy/template" data-each="template">', $component);
    $component = preg_replace('/{{[\/]each}}/', '</script><div data-each="render"></div></div>', $component);

    //Replace if block
    $component = preg_replace_callback($patternIf, 
                                       "extractIfs", $component);

    //Replace attribute binding. TODO:Review
    $component = preg_replace_callback('/{{bind\-attr\s+(.*)}}/i', 
                                       function ($matches) {
                                           return 'data-bind-attr="'.str_replace('"', 
                                                                                 "'", 
                                                                                 $matches[1]).'"';
                                       }, $component);

    //Replace variables.
    $component = preg_replace('/{{('.$attr_match.')}}/i', 
                              '<script type="emberfy/template" data-var="${1}"></script>', 
                              $component);

    //Generate the widget
    $widget.="<".$tagName." data-widget='".$name."'>";
    $widget.= $component;
    $widget.="</".$tagName.">";
    return $widget;
}


?>
