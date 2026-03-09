<h1>MAKE NEW PROJECT</h1>
<form method="POST" class="m-auto flex w-80 flex-col">
	<label for="title">Title</label>
	<input type="text" id="title" name="title" class="bg-gray-300 p-4" required />
	<label for="desc">Description</label>
	<textarea id="desc" name="desc" class="bg-gray-300 p-4"></textarea>
	<label for="category">Category</label>
	<select name="category" id="category" class="bg-gray-300 p-4">
		<option value="GAME">Game</option>
		<option value="WEBSITE">Website</option>
		<option value="MUSIC">Music</option>
		<option value="OTHER">Other</option>
	</select>
	<p>todo: hackatime</p>

	<input type="submit" value="Create Project" class="cursor-pointer bg-blue-300 p-4" />
</form>
