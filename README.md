# pizzadiv
Fair pizza division game! Maybe you'll learn long division, maybe not...

As part of NaNoWriMo 2017, I decded to finally put this figment of my imagination into concrete code. The idea being that I will write code and comments for at least one hour every day for the month of November and commit to my github repo here.
The game will be simple, on each level, you will be presented with some pizza squares, and some hungry kids. You need to divide the pizza fairly and evenly between them.
The actions you can take are two: swipe horizontally to cut the pizza to smaller slices or swipe from to to bottom to give the hungry kids slices of pizza.
Levels change difficulty as different combinations of number of pizzas and different number of kids show up. Another important twist is the behavior of the knife. It is no simple knife! It is a multi-slice cutter. And changes the number of slices it produces on different levels.

Since writing code is not about producing large quantity of words and a readme or other documentation might be, expect the month of November 2017 to be more about explaining the game than actually coding it.

The idea for the game started a few years ago when I was having a conversation with my kids about math. They ask me for riddles for their amusement before we're served hamburgers in a restaurant they like. When they were younger they enjoyed the restaurant's kids menu with it's riddles but they outgrew them quickly.

The game is simple and can be played on some sheets of paper. Draw some squares and some kids, I drew them as pacman figures. Have a magic knife that cuts each pizza into 10 even slices, other magic knifes are used for special insights. Whenever you use the knife, it cuts all the pizzas you have.

Now comes the fun part, at least the fun part of developing the story of the game. Some combinations of knifes, pizza and kids are easier to solve than others.

One important thing to realise is that the game can have several different solutions for the levels. For instance, let's start with the trivial level of one pizza and one kid. No need to use the knife, just slide down to give the whole pizza to the one kid.
This is equivalent to the equation: 1/1=1

Next level could start with two pizzas and one kid, simple as the first level, just slide the pizza twice to give both pizzas to the single kid. 2/1 = 2

Now that we're almost losing our ~~client~~ user, we add the knife. But initially it will be an ordinary knife that cuts each pizza into 2 equal pieces.
If there are more pizzas than kids, you can distribute pizza to kids. Cut only the remaining pizza.

Correction: perhaps each swipe down should distribute one pizza part to each of the kids. If we have 6 pizza parts and 5 kids, it would be too much to ask the user to swipe down 5 times to give the first 5 parts to the kids. Better to swipe once and have the animation and sound effects repeat for each pizza part and have a satisfying chomping sound when each kid gets his pizza part to eat.

I want to use phaser to create this game.
https://gamedevacademy.org/wp-content/uploads/2016/08/Game-Development-for-Human-Beings-ebook.pdf

Mistakes should cause a quick animation with some humor showing that some kids got more than others. maybe they should fight over the pieces?
Quickly restarting the level.
